import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - 当前用户的通知列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30', 10) || 30, 1), 100);
    const unreadOnly = searchParams.get('unread') === '1';

    const where: any = { userId: session.user.id };
    if (unreadOnly) where.read = false;

    const [items, unreadCount] = await Promise.all([
      (prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      (prisma as any).notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    console.error('获取通知失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST - 全部标为已读
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    await (prisma as any).notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// DELETE - 删除所有已读通知
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    const result = await (prisma as any).notification.deleteMany({
      where: { userId: session.user.id, read: true },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
