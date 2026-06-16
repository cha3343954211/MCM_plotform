// AI 配置 API —— 加固版：所有错误都返回 JSON，永不返回空 body
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

function maskKey(key: string | null | undefined) {
  if (!key) return '';
  const s = String(key);
  if (s.length <= 8) return '*'.repeat(s.length);
  return s.slice(0, 3) + '*'.repeat(Math.max(4, s.length - 7)) + s.slice(-4);
}

// 默认配置（兜底用，避免数据库访问失败时 500）
const DEFAULT_CONFIG = {
  id: 'default',
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  pdfMode: 'text',
  temperature: 0.2,
  maxTokens: 2000,
  timeoutMs: 120000,
  systemPrompt: '',
  userPromptTpl: '',
  updatedBy: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function readConfig() {
  try {
    let cfg = await (prisma as any).aiConfig.findUnique({ where: { id: 'default' } });
    if (!cfg) {
      cfg = await (prisma as any).aiConfig.create({ data: { id: 'default' } }).catch(() => null);
    }
    return cfg;
  } catch (e) {
    console.error('[ai-config] readConfig error:', e);
    return null;
  }
}

// GET /api/admin/ai-config —— 仅 admin 可读，apiKey 仅返回遮蔽值
export async function GET() {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    if (!session || !isAdminRole((session.user as any)?.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    const config = await readConfig();
    if (!config) {
      // 数据库读失败时返回兜底配置 + hasApiKey=false，至少不让前端崩
      return NextResponse.json({ ...DEFAULT_CONFIG, apiKeyMasked: '', hasApiKey: false, _warning: '数据库读取失败，已返回默认配置' });
    }
    const { apiKey, ...rest } = config;
    return NextResponse.json({ ...rest, apiKeyMasked: maskKey(apiKey), hasApiKey: Boolean(apiKey) });
  } catch (e: any) {
    console.error('[ai-config] GET error:', e);
    return NextResponse.json({ error: `GET 失败：${e?.message || '未知错误'}` }, { status: 500 });
  }
}

// PUT /api/admin/ai-config —— 更新 AI 配置
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    if (!session || !isAdminRole((session.user as any)?.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误（需 application/json）' }, { status: 400 }); }

    const update: any = {};
    if (typeof body.enabled === 'boolean') update.enabled = body.enabled;
    if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
      update.baseUrl = body.baseUrl.trim().replace(/\/+$/, '');
    }
    if (typeof body.model === 'string' && body.model.trim()) {
      update.model = body.model.trim();
    }
    if (typeof body.pdfMode === 'string' && ['text', 'file', 'auto'].includes(body.pdfMode)) {
      update.pdfMode = body.pdfMode;
    }
    if (body.temperature !== undefined) {
      const t = Number(body.temperature);
      if (isFinite(t)) update.temperature = Math.max(0, Math.min(2, t));
    }
    if (body.maxTokens !== undefined) {
      const m = parseInt(body.maxTokens, 10);
      if (!isNaN(m)) update.maxTokens = Math.max(64, Math.min(8000, m));
    }
    if (body.timeoutMs !== undefined) {
      const m = parseInt(body.timeoutMs, 10);
      if (!isNaN(m)) update.timeoutMs = Math.max(5000, Math.min(600000, m));
    }
    if (typeof body.systemPrompt === 'string') {
      update.systemPrompt = body.systemPrompt.slice(0, 4000);
    }
    if (typeof body.userPromptTpl === 'string') {
      update.userPromptTpl = body.userPromptTpl.slice(0, 12000);
    }
    if (typeof body.apiKey === 'string') {
      const trimmed = body.apiKey.trim();
      if (trimmed && trimmed !== '********') {
        update.apiKey = trimmed.slice(0, 500);
      } else if (body.clearApiKey === true) {
        update.apiKey = null;
      }
    }

    update.updatedBy = (session.user as any).id;

    let config;
    try {
      config = await (prisma as any).aiConfig.upsert({
        where: { id: 'default' },
        update,
        create: { id: 'default', ...update },
      });
    } catch (e: any) {
      console.error('[ai-config] upsert error:', e);
      return NextResponse.json({ error: `数据库写入失败：${e?.message || '未知错误'}` }, { status: 500 });
    }
    const { apiKey, ...rest } = config;
    return NextResponse.json({ ...rest, apiKeyMasked: maskKey(apiKey), hasApiKey: Boolean(apiKey) });
  } catch (e: any) {
    console.error('[ai-config] PUT error:', e);
    return NextResponse.json({ error: `PUT 失败：${e?.message || '未知错误'}` }, { status: 500 });
  }
}
