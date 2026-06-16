import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// 遮蔽 API Key：保留前 3 后 4
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
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole((session.user as any)?.role)) {
      return { error: NextResponse.json({ error: '无权限' }, { status: 403 }) };
    }
    return { session };
  } catch (e: any) {
    return { error: NextResponse.json({ error: `鉴权失败：${e?.message || '未知错误'}` }, { status: 500 }) };
  }
}

// GET /api/admin/ai-presets —— 列出所有预设
export async function GET() {
  try {
    const auth = await ensureAdmin();
    if ('error' in auth) return auth.error;
    let list: any[] = [];
    try {
      list = await (prisma as any).aiConfigPreset.findMany({
        orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
      });
    } catch (e: any) {
      console.error('[ai-presets] findMany error:', e);
      return NextResponse.json({ error: `数据库读取失败：${e?.message || '未知错误'}` }, { status: 500 });
    }
    return NextResponse.json({ presets: list.map(shapePreset) });
  } catch (e: any) {
    console.error('[ai-presets] GET error:', e);
    return NextResponse.json({ error: `GET 失败：${e?.message || '未知错误'}` }, { status: 500 });
  }
}

// POST /api/admin/ai-presets —— 创建预设
export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAdmin();
    if ('error' in auth) return auth.error;

    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }

    const name = String(body?.name || '').trim().slice(0, 60);
    if (!name) return NextResponse.json({ error: '预设名称必填' }, { status: 400 });
    const baseUrl = String(body?.baseUrl || '').trim();
    if (!baseUrl) return NextResponse.json({ error: 'baseUrl 必填' }, { status: 400 });
    const model = String(body?.model || '').trim();
    if (!model) return NextResponse.json({ error: 'model 必填' }, { status: 400 });

    let created;
    try {
      created = await (prisma as any).aiConfigPreset.create({
        data: {
          name,
          description: body?.description ? String(body.description).slice(0, 200) : null,
          baseUrl,
          apiKey: body?.apiKey ? String(body.apiKey) : null,
          model,
          pdfMode: ['text', 'file', 'auto'].includes(body?.pdfMode) ? body.pdfMode : 'text',
          temperature: Number.isFinite(+body?.temperature) ? +body.temperature : 0.2,
          maxTokens: Number.isFinite(+body?.maxTokens) ? +body.maxTokens : 2000,
          timeoutMs: Number.isFinite(+body?.timeoutMs) ? +body.timeoutMs : 120000,
          systemPrompt: String(body?.systemPrompt || '').slice(0, 8000),
          userPromptTpl: String(body?.userPromptTpl || '').slice(0, 16000),
          isBuiltIn: false,
          createdBy: (auth.session!.user as any).id,
        },
      });
    } catch (e: any) {
      console.error('[ai-presets] create error:', e);
      return NextResponse.json({ error: `数据库写入失败：${e?.message || '未知错误'}` }, { status: 500 });
    }
    return NextResponse.json(shapePreset(created));
  } catch (e: any) {
    console.error('[ai-presets] POST error:', e);
    return NextResponse.json({ error: `POST 失败：${e?.message || '未知错误'}` }, { status: 500 });
  }
}
