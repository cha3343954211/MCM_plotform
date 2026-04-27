import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = ['user', 'changelog'] as const;
type GuideKey = (typeof ALLOWED_KEYS)[number];

export async function GET() {
  try {
    const docs = await (prisma as any).guideDoc.findMany({ where: { key: { in: ALLOWED_KEYS as unknown as string[] } } });
    const out: Record<GuideKey, { content: string; updatedAt: string | null }> = {
      user: { content: '', updatedAt: null },
      changelog: { content: '', updatedAt: null },
    };
    for (const d of docs as any[]) {
      if (ALLOWED_KEYS.includes(d.key)) {
        out[d.key as GuideKey] = { content: d.content || '', updatedAt: d.updatedAt?.toISOString?.() || null };
      }
    }
    return NextResponse.json(out);
  } catch (error) {
    return NextResponse.json({ user: { content: '', updatedAt: null }, changelog: { content: '', updatedAt: null } });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const key = String(body?.key || '').trim();
  const content = String(body?.content ?? '');
  if (!ALLOWED_KEYS.includes(key as GuideKey)) {
    return NextResponse.json({ error: '不支持的文档类型' }, { status: 400 });
  }
  if (content.length > 50000) {
    return NextResponse.json({ error: '内容过长（上限 50000 字符）' }, { status: 400 });
  }

  const doc = await (prisma as any).guideDoc.upsert({
    where: { key },
    update: { content },
    create: { key, content },
  });

  return NextResponse.json({ ok: true, key, updatedAt: doc.updatedAt });
}
