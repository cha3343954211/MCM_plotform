import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PATCH - 标记为已读/未读
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const read = body?.read !== false;

    const note = await (prisma as any).notification.findUnique({ where: { id: params.id } });
    if (!note || note.userId !== session.user.id) {
      return NextResponse.json({ error: '不存在或无权限' }, { status: 404 });
    }

    const updated = await (prisma as any).notification.update({
      where: { id: params.id },
      data: { read },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// DELETE - 删除单个通知
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    const note = await (prisma as any).notification.findUnique({ where: { id: params.id } });
    if (!note || note.userId !== session.user.id) {
      return NextResponse.json({ error: '不存在或无权限' }, { status: 404 });
    }
    await (prisma as any).notification.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
