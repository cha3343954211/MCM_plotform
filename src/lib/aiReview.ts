// AI 评审核心：解析 PDF、调用 OpenAI 兼容接口、解析模型返回的 JSON。
// 与具体业务解耦：纯函数 + 一个 runAiReview 编排函数。

import fs from 'fs';
import path from 'path';
import prisma from './prisma';

// pdf-parse v1.1.1：通过子路径 lib/pdf-parse.js 引入，避开其顶层 README 调试测试。
// v2.x 的 pdfjs-dist 在 Next.js 服务端打包下会崩（缺 Node polyfill），故固定到 v1。
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export type PdfMode = 'text' | 'file' | 'auto';

export interface AiConfigLike {
  enabled: boolean;
  baseUrl: string;
  apiKey: string | null;
  model: string;
  pdfMode: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  systemPrompt: string;
  userPromptTpl: string;
}

export interface CompetitionLike {
  id: string;
  title: string;
  description: string;
  content: string;
}

export interface SubmissionLike {
  id: string;
  fileName: string;
  filePath: string;
  notes?: string | null;
  teamName?: string | null;
}

export interface ParsedAiResult {
  score: number | null;
  summary: string | null;
  feedback: string | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  dimensions: Record<string, number>;
  raw: any;
}

const DEFAULT_PDF_TEXT_LIMIT = 24000; // 防止 prompt 爆栈

export async function extractPdfText(absPath: string): Promise<{ text: string; pages: number }> {
  const buf = await fs.promises.readFile(absPath);
  // pdf-parse v1.1.1：函数式调用，直接传 buffer，返回 { text, numpages, ... }
  const data = await (pdfParse as any)(buf);
  return { text: String(data?.text || ''), pages: Number(data?.numpages || 0) };
}

export async function readPdfAsDataUrl(absPath: string): Promise<string> {
  const buf = await fs.promises.readFile(absPath);
  return 'data:application/pdf;base64,' + buf.toString('base64');
}

function clampText(s: string, max: number) {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n\n...(内容过长已截断)';
}

function buildCompetitionBlock(competition: CompetitionLike) {
  return [
    `标题：${competition.title || ''}`,
    `简介：${competition.description || ''}`,
    '',
    '赛题正文（Markdown）：',
    competition.content || '',
  ].join('\n');
}

export function buildPrompt(
  config: AiConfigLike,
  competition: CompetitionLike,
  submission: SubmissionLike,
  pdfText: string
) {
  const competitionBlock = buildCompetitionBlock(competition);
  const userPrompt = config.userPromptTpl
    .replace('{competition}', competitionBlock)
    .replace('{fileName}', submission.fileName || '论文.pdf')
    .replace('{pdfContent}', clampText(pdfText, DEFAULT_PDF_TEXT_LIMIT));
  return { system: config.systemPrompt, user: userPrompt };
}

function safeJsonParse(s: string): any | null {
  if (!s) return null;
  // 去掉可能的 ```json ... ``` 包裹
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : s;
  // 找首个 { 与末位 }
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first < 0 || last <= first) return null;
  try {
    return JSON.parse(candidate.slice(first, last + 1));
  } catch {
    return null;
  }
}

function clampScore(v: any): number | null {
  const n = Number(v);
  if (!isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function clampDimensions(obj: any): Record<string, number> {
  if (!obj || typeof obj !== 'object') return {};
  const out: Record<string, number> = {};
  for (const k of Object.keys(obj)) {
    const v = clampScore(obj[k]);
    if (v !== null) out[k] = v;
  }
  return out;
}

function asStringArray(v: any): string[] {
  if (Array.isArray(v)) return v.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 12);
  if (typeof v === 'string') return v.split(/[\n;。]/).map(s => s.trim()).filter(Boolean).slice(0, 12);
  return [];
}

export function parseAiResponse(raw: string): ParsedAiResult {
  const json = safeJsonParse(raw);
  if (!json || typeof json !== 'object') {
    return { score: null, summary: null, feedback: null, strengths: [], weaknesses: [], suggestions: [], dimensions: {}, raw: null };
  }
  return {
    score: clampScore(json.score),
    summary: typeof json.summary === 'string' ? json.summary.slice(0, 2000) : null,
    feedback: typeof json.feedback === 'string' ? json.feedback.slice(0, 4000) : null,
    strengths: asStringArray(json.strengths),
    weaknesses: asStringArray(json.weaknesses),
    suggestions: asStringArray(json.suggestions),
    dimensions: clampDimensions(json.dimensions),
    raw: json,
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: any;
}

interface ChatChoice {
  message: { role: string; content: string };
  finish_reason?: string;
}

interface ChatResponse {
  choices: ChatChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function callChatCompletion(
  config: AiConfigLike,
  messages: ChatMessage[]
): Promise<{ text: string; latencyMs: number; usage: ChatResponse['usage']; status: number }> {
  const base = (config.baseUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('AI baseUrl 未配置');
  if (!config.apiKey) throw new Error('AI apiKey 未配置');
  const url = `${base}/chat/completions`;
  const body = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: false,
  };
  const controller = new AbortController();
  // 默认 120s：本地 Ollama 冷启动 30s+、大论文（17 页）首次推理 60s+ 都很常见
  // 最小 30s：再短对真实 AI 服务毫无意义
  const timeoutMs = Math.max(30000, Number(config.timeoutMs) || 120000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - t0;
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`AI 接口返回 ${res.status}: ${text.slice(0, 500)}`);
    }
    let data: ChatResponse;
    try { data = JSON.parse(text); } catch { throw new Error('AI 返回非 JSON：' + text.slice(0, 200)); }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content) {
      throw new Error('AI 返回内容为空');
    }
    return { text: content, latencyMs, usage: data.usage, status: res.status };
  } catch (e: any) {
    // 把超时 / 中断翻译成可读中文，并附带可调参数提示
    const isAbort = e?.name === 'AbortError' || /aborted|abort/i.test(String(e?.message || ''));
    if (isAbort) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      throw new Error(
        `AI 请求超时（已等待 ${elapsed}s / 上限 ${Math.round(timeoutMs / 1000)}s）。` +
        `可能原因：1) 模型较慢（Ollama 本地/免费服务常见）；2) 论文太长被截断后仍较大；` +
        `请在「AI 评审配置」调大 timeoutMs（建议 120000 即 120 秒），或换用更快的模型。`
      );
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// 决定本次调用采用哪种 PDF 模式
export function resolvePdfMode(config: AiConfigLike): PdfMode {
  const mode = (config.pdfMode || 'text') as PdfMode;
  if (mode !== 'auto') return mode;
  // 简单启发：模型名含 gpt-4o / qwen-vl / gemini / claude / doubao / glm-4v 则 file
  const m = (config.model || '').toLowerCase();
  if (/gpt-4o|qwen-vl|gemini|claude|doubao|glm-4v|vision|vl/.test(m)) return 'file';
  return 'text';
}

function isPdfFile(fileName: string) {
  return /\.pdf$/i.test(fileName || '');
}

export interface RunOptions {
  adminId: string;
  adminName?: string;
}

export async function runAiReview(
  submissionId: string,
  options: RunOptions
): Promise<{ reviewId: string; status: 'success' | 'failed'; result: ParsedAiResult | null; error?: string }> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { competition: true },
  });
  if (!submission) throw new Error('提交不存在');
  if (!isPdfFile(submission.fileName)) {
    throw new Error('AI 评审仅支持 PDF 文件，请先确保参赛者提交 PDF');
  }

  const config = await (prisma as any).aiConfig.findUnique({ where: { id: 'default' } });
  if (!config) throw new Error('请先在管理后台配置 AI 评审');
  if (!config.enabled) throw new Error('AI 评审未启用，请在后台开启');
  if (!config.apiKey) throw new Error('AI apiKey 未配置');

  const mode = resolvePdfMode(config);

  // 先创建 pending 记录
  const review = await (prisma as any).aiReview.create({
    data: {
      submissionId,
      competitionId: submission.competitionId,
      userId: submission.userId,
      triggeredBy: options.adminId,
      status: 'pending',
      model: config.model,
      pdfMode: mode,
      baseUrl: config.baseUrl,
    },
  });

  try {
    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const abs = path.normalize(path.join(process.cwd(), 'public', submission.filePath));
    if (!abs.startsWith(uploadsRoot)) {
      throw new Error('提交文件路径非法');
    }
    if (!fs.existsSync(abs)) throw new Error('提交文件不存在');

    const { system, user } = buildPrompt(config as any, submission.competition as any, submission as any, '');

    const messages: ChatMessage[] = [{ role: 'system', content: system }];

    if (mode === 'file') {
      // 多模态：把 PDF 作为 file 输入
      const dataUrl = await readPdfAsDataUrl(abs);
      const promptWithFileNote = user + '\n\n（附件为参赛论文 PDF，请直接阅读并评审）';
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptWithFileNote },
          { type: 'file', file: { filename: submission.fileName, file_data: dataUrl } },
        ],
      });
      // 用异步 stat 避免阻塞事件循环（AI 评审是长任务，同步 stat 会冻结整个 Node 进程）
      let pdfSizeKb = '?';
      try {
        const s = await fs.promises.stat(abs);
        pdfSizeKb = (s.size / 1024).toFixed(1);
      } catch { /* 文件可能已被清理，记成 ? 即可 */ }
      await (prisma as any).aiReview.update({
        where: { id: review.id },
        data: { requestSummary: `pdfMode=file; size=${pdfSizeKb}KB` },
      });
    } else {
      // 文本模式
      const { text: pdfText, pages } = await extractPdfText(abs);
      const text = buildPrompt(config as any, submission.competition as any, submission as any, pdfText).user;
      messages.push({ role: 'user', content: text });
      await (prisma as any).aiReview.update({
        where: { id: review.id },
        data: { requestSummary: `pdfMode=text; pages=${pages}; textLen=${pdfText.length}` },
      });
    }

    const t0 = Date.now();
    const call = await callChatCompletion(config as any, messages);
    const latencyMs = Date.now() - t0;
    const parsed = parseAiResponse(call.text);

    await (prisma as any).aiReview.update({
      where: { id: review.id },
      data: {
        status: 'success',
        rawResponse: call.text.slice(0, 8000),
        parsedScore: parsed.score,
        parsedSummary: parsed.summary,
        parsedFeedback: parsed.feedback,
        parsedDimensions: Object.keys(parsed.dimensions).length > 0 ? JSON.stringify(parsed.dimensions) : null,
        parsedJson: JSON.stringify(parsed.raw).slice(0, 16000),
        latencyMs,
        inputTokens: call.usage?.prompt_tokens || null,
        outputTokens: call.usage?.completion_tokens || null,
      },
    });

    return { reviewId: review.id, status: 'success', result: parsed };
  } catch (e: any) {
    const msg = e?.message || String(e);
    await (prisma as any).aiReview.update({
      where: { id: review.id },
      data: { status: 'failed', errorMessage: msg.slice(0, 2000) },
    });
    return { reviewId: review.id, status: 'failed', result: null, error: msg };
  }
}

// 将 AI 评分"采纳"为该提交的官方分数
export async function applyAiReview(aiReviewId: string, adminId: string) {
  const r = await (prisma as any).aiReview.findUnique({ where: { id: aiReviewId } });
  if (!r) throw new Error('AI 评审记录不存在');
  if (r.status !== 'success') throw new Error('该 AI 评审未成功，无法采纳');
  if (r.parsedScore === null || r.parsedScore === undefined) throw new Error('该 AI 评审未解析出分数');
  await prisma.submission.update({
    where: { id: r.submissionId },
    data: {
      score: r.parsedScore,
      feedback: r.parsedFeedback || r.parsedSummary || null,
      status: 'graded',
    },
  });
  await (prisma as any).aiReview.update({
    where: { id: aiReviewId },
    data: { applied: true, appliedBy: adminId, appliedAt: new Date() },
  });
  return { ok: true };
}
