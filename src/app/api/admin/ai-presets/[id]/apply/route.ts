import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// POST /api/admin/ai-presets/[id]/apply
// 把预设内容写入当前 AiConfig（upsert id=default），并立刻可被 AI 评审使用
export async function POST(_request: NextRequest, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const id = ctx.params.id;
  const preset = await (prisma as any).aiConfigPreset.findUnique({ where: { id } });
  if (!preset) return NextResponse.json({ error: '预设不存在' }, { status: 404 });

  // 不覆盖已存在的 apiKey（除非预设里有新的）
  const current = await (prisma as any).aiConfig.findUnique({ where: { id: 'default' } });
  const finalApiKey = preset.apiKey || current?.apiKey || null;

  const updated = await (prisma as any).aiConfig.upsert({
    where: { id: 'default' },
    update: {
      baseUrl: preset.baseUrl,
      apiKey: finalApiKey,
      model: preset.model,
      pdfMode: preset.pdfMode,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
      timeoutMs: preset.timeoutMs,
      systemPrompt: preset.systemPrompt,
      userPromptTpl: preset.userPromptTpl,
      updatedBy: (session.user as any).id,
    },
    create: {
      id: 'default',
      enabled: true,
      baseUrl: preset.baseUrl,
      apiKey: finalApiKey,
      model: preset.model,
      pdfMode: preset.pdfMode,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
      timeoutMs: preset.timeoutMs,
      systemPrompt: preset.systemPrompt,
      userPromptTpl: preset.userPromptTpl,
      updatedBy: (session.user as any).id,
    },
  });

  // 注意：ApiConfig 默认 apiKey 在 PUT /api/admin/ai-config 路由里会被遮蔽回传
  return NextResponse.json({ ok: true, appliedFrom: preset.id, configId: updated.id });
}
