import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

function maskKey(k: any) {
  if (!k) return null;
  const s = String(k);
  if (s.length <= 8) return s.slice(0, 2) + '***';
  return s.slice(0, 3) + '***' + s.slice(-4);
}
function shapePreset(p: any) {
  return { ...p, apiKey: maskKey(p.apiKey), apiKeySet: !!p.apiKey };
}

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return { error: NextResponse.json({ error: '无权限' }, { status: 403 }) };
  }
  return { session };
}

// PATCH /api/admin/ai-presets/[id] —— 更新预设（不允许改 name 当 isBuiltIn=true）
// DELETE /api/admin/ai-presets/[id] —— 删除预设（isBuiltIn 不允许）
// POST   /api/admin/ai-presets/[id]/apply —— 把预设写入当前 AiConfig
export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await ensureAdmin();
  if ('error' in auth) return auth.error;
  const id = ctx.params.id;
  const preset = await (prisma as any).aiConfigPreset.findUnique({ where: { id } });
  if (!preset) return NextResponse.json({ error: '预设不存在' }, { status: 404 });
  if (preset.isBuiltIn) return NextResponse.json({ error: '内置预设不可编辑' }, { status: 400 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }
  const data: any = {};
  if (typeof body?.name === 'string') data.name = body.name.trim().slice(0, 60) || preset.name;
  if (typeof body?.description === 'string') data.description = body.description.slice(0, 200);
  if (typeof body?.baseUrl === 'string' && body.baseUrl.trim()) data.baseUrl = body.baseUrl.trim();
  if (typeof body?.model === 'string' && body.model.trim()) data.model = body.model.trim();
  if (typeof body?.apiKey === 'string') data.apiKey = body.apiKey || null; // 空字符串 = 清除
  if (['text', 'file', 'auto'].includes(body?.pdfMode)) data.pdfMode = body.pdfMode;
  if (Number.isFinite(+body?.temperature)) data.temperature = +body.temperature;
  if (Number.isFinite(+body?.maxTokens)) data.maxTokens = +body.maxTokens;
  if (Number.isFinite(+body?.timeoutMs)) data.timeoutMs = +body.timeoutMs;
  if (typeof body?.systemPrompt === 'string') data.systemPrompt = body.systemPrompt.slice(0, 8000);
  if (typeof body?.userPromptTpl === 'string') data.userPromptTpl = body.userPromptTpl.slice(0, 16000);

  const updated = await (prisma as any).aiConfigPreset.update({ where: { id }, data });
  return NextResponse.json(shapePreset(updated));
}

export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await ensureAdmin();
  if ('error' in auth) return auth.error;
  const id = ctx.params.id;
  const preset = await (prisma as any).aiConfigPreset.findUnique({ where: { id } });
  if (!preset) return NextResponse.json({ error: '预设不存在' }, { status: 404 });
  // 内置预设必须显式传 ?force=true 才能删（防误操作）
  if (preset.isBuiltIn) {
    const force = request.nextUrl.searchParams.get('force');
    if (force !== 'true') {
      return NextResponse.json(
        { error: '内置预设受保护，需 force=true 才能删除（删除后可用「恢复内置预设」重新生成）', needsForce: true, isBuiltIn: true },
        { status: 400 }
      );
    }
  }
  await (prisma as any).aiConfigPreset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
