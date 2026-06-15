import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = '你是一名资深的数学建模竞赛评审专家。请基于赛题要求和参赛论文，公正、专业、具体地评审论文质量。';
const USER_PROMPT_TPL = `## 赛题信息\n\n{competition}\n\n## 参赛论文（{fileName}）\n\n{pdfContent}\n\n请按以下 JSON 结构返回评审结果：
{
  "score": 0-100 的整数或一位小数，代表综合得分,
  "summary": "对论文的总体评价，2-4 句话",
  "strengths": ["亮点1", "亮点2", ...],
  "weaknesses": ["不足1", "不足2", ...],
  "suggestions": ["改进建议1", ...],
  "dimensions": {
    "建模质量": 0-100,
    "求解方法": 0-100,
    "结果分析": 0-100,
    "论文表达": 0-100
  },
  "feedback": "一段话写给参赛者的总评，会展示在管理后台"
}
只返回合法 JSON，不要包裹 \`\`\` 代码块。`;

const BUILTINS: Array<{ id: string; name: string; description: string; baseUrl: string; model: string; timeoutMs: number }> = [
  { id: 'builtin_openai_gpt4o', name: 'OpenAI · gpt-4o-mini', description: 'OpenAI 官方接口，速度快、价格低，文本模式直接传抽取后的论文', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', timeoutMs: 90000 },
  { id: 'builtin_deepseek_chat', name: 'DeepSeek · deepseek-chat', description: '国内直连、价格低、长文本友好；默认 128K 上下文', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', timeoutMs: 120000 },
  { id: 'builtin_qwen_turbo', name: '通义千问 · qwen-turbo', description: '阿里云 DashScope OpenAI 兼容入口；需先在阿里云开通并拿到 API Key', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo', timeoutMs: 120000 },
  { id: 'builtin_ollama_local', name: 'Ollama · 本地模型', description: '本地 Ollama 服务，默认 11434 端口，模型按你本地拉取的名字改（如 qwen2.5:7b）', baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen2.5:7b', timeoutMs: 180000 },
];

// POST /api/admin/ai-presets/builtin/reset
// 恢复被删除的内置预设：已存在的跳过，新增
export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const restored: string[] = [];
  for (const b of BUILTINS) {
    const exists = await (prisma as any).aiConfigPreset.findUnique({ where: { id: b.id } });
    if (exists) continue;
    await (prisma as any).aiConfigPreset.create({
      data: {
        id: b.id,
        name: b.name,
        description: b.description,
        baseUrl: b.baseUrl,
        apiKey: null,
        model: b.model,
        pdfMode: 'text',
        temperature: 0.2,
        maxTokens: 2000,
        timeoutMs: b.timeoutMs,
        systemPrompt: SYSTEM_PROMPT,
        userPromptTpl: USER_PROMPT_TPL,
        isBuiltIn: true,
      },
    });
    restored.push(b.id);
  }
  return NextResponse.json({ ok: true, restored, skipped: BUILTINS.length - restored.length });
}
