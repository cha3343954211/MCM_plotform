import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 100);
    if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 200);
    if (body.description !== undefined) data.description = String(body.description).slice(0, 1000);
    if (body.content !== undefined) data.content = String(body.content).slice(0, 50000);
    if (body.durationDays !== undefined) data.durationDays = Math.max(1, Math.min(365, Number(body.durationDays) || 7));
    const tpl = await (prisma as any).competitionTemplate.update({ where: { id: params.id }, data });
    return NextResponse.json(tpl);
  } catch (e) {
    return NextResponse.json({ error: '更新模板失败' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  try {
    await (prisma as any).competitionTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: '删除模板失败' }, { status: 500 });
  }
}
