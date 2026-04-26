import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: 获取点赞数与当前用户是否已赞
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const [count, mine] = await Promise.all([
    (prisma as any).showcaseLike.count({ where: { submissionId: params.id } }),
    session
      ? (prisma as any).showcaseLike.findUnique({
          where: { userId_submissionId: { userId: session.user.id, submissionId: params.id } },
        })
      : Promise.resolve(null),
  ]);
  return NextResponse.json({ count, liked: !!mine });
}

// POST: 切换点赞
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  // 全站互动开关（与评论共用）
  const cfg = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
  if (cfg && (cfg as any).commentsEnabled === false) {
    return NextResponse.json({ error: '互动功能已关闭' }, { status: 403 });
  }

  const sub = await prisma.submission.findUnique({
    where: { id: params.id },
    select: { id: true, showcased: true },
  });
  if (!sub || !sub.showcased) return NextResponse.json({ error: '作品未公示' }, { status: 404 });

  const existing = await (prisma as any).showcaseLike.findUnique({
    where: { userId_submissionId: { userId: session.user.id, submissionId: params.id } },
  });
  if (existing) {
    await (prisma as any).showcaseLike.delete({
      where: { userId_submissionId: { userId: session.user.id, submissionId: params.id } },
    });
  } else {
    await (prisma as any).showcaseLike.create({
      data: { userId: session.user.id, submissionId: params.id },
    });
  }
  const count = await (prisma as any).showcaseLike.count({ where: { submissionId: params.id } });
  return NextResponse.json({ count, liked: !existing });
}
