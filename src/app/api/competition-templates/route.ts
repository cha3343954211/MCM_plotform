import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const list = await (prisma as any).competitionTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim().slice(0, 100);
    const title = String(body?.title || '').trim().slice(0, 200);
    const description = String(body?.description || '').slice(0, 1000);
    const content = String(body?.content || '').slice(0, 50000);
    const durationDays = Math.max(1, Math.min(365, Number(body?.durationDays) || 7));
    if (!name || !title) {
      return NextResponse.json({ error: '模板名和默认标题必填' }, { status: 400 });
    }
    const tpl = await (prisma as any).competitionTemplate.create({
      data: { name, title, description, content, durationDays },
    });
    return NextResponse.json(tpl);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '创建模板失败' }, { status: 500 });
  }
}
