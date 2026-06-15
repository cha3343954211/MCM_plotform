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

// GET /api/admin/ai-config —— 仅 admin 可读，apiKey 仅返回遮蔽值
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  let config = await (prisma as any).aiConfig.findUnique({ where: { id: 'default' } });
  if (!config) {
    config = await (prisma as any).aiConfig.create({ data: { id: 'default' } });
  }
  // 不回传原始 apiKey
  const { apiKey, ...rest } = config;
  return NextResponse.json({ ...rest, apiKeyMasked: maskKey(apiKey), hasApiKey: Boolean(apiKey) });
}

// PUT /api/admin/ai-config —— 更新 AI 配置
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }

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
  if (typeof body.systemPrompt === 'string' && body.systemPrompt.trim()) {
    update.systemPrompt = body.systemPrompt.slice(0, 4000);
  }
  if (typeof body.userPromptTpl === 'string' && body.userPromptTpl.trim()) {
    update.userPromptTpl = body.userPromptTpl.slice(0, 12000);
  }
  // apiKey：只有在显式提供非空字符串时才更新
  if (typeof body.apiKey === 'string') {
    const trimmed = body.apiKey.trim();
    if (trimmed && trimmed !== '********') {
      update.apiKey = trimmed.slice(0, 500);
    } else if (body.clearApiKey === true) {
      update.apiKey = null;
    }
  }

  update.updatedBy = (session.user as any).id;

  const config = await (prisma as any).aiConfig.upsert({
    where: { id: 'default' },
    update,
    create: { id: 'default', ...update },
  });
  const { apiKey, ...rest } = config;
  return NextResponse.json({ ...rest, apiKeyMasked: maskKey(apiKey), hasApiKey: Boolean(apiKey) });
}
