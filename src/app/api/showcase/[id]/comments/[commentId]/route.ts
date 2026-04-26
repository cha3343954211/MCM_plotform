import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PATCH: admin 隐藏/恢复评论
export async function PATCH(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const hidden = Boolean(body?.hidden);
  await (prisma as any).showcaseComment.update({
    where: { id: params.commentId },
    data: { hidden },
  });
  return NextResponse.json({ ok: true });
}

// DELETE: admin 或评论作者删除
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const c = await (prisma as any).showcaseComment.findUnique({ where: { id: params.commentId } });
  if (!c) return NextResponse.json({ error: '评论不存在' }, { status: 404 });
  if (session.user.role !== 'admin' && c.userId !== session.user.id) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  await (prisma as any).showcaseComment.delete({ where: { id: params.commentId } });
  return NextResponse.json({ ok: true });
}
