import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// GET: 列出公示作品的评论（隐藏的对普通用户不可见，admin 全可见）
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';

  const sub = await prisma.submission.findUnique({
    where: { id: params.id },
    select: { id: true, showcased: true },
  });
  if (!sub || (!sub.showcased && !isAdmin)) {
    return NextResponse.json({ error: '作品未公示' }, { status: 404 });
  }

  const comments = await (prisma as any).showcaseComment.findMany({
    where: isAdmin ? { submissionId: params.id } : { submissionId: params.id, hidden: false },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json(comments);
}

// POST: 发表评论（限流：同一用户 1 分钟最多 5 条）
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const limit = rateLimit(`comment:${session.user.id}`, 5, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `评论太频繁，请 ${limit.retryAfterSec} 秒后重试` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const sub = await prisma.submission.findUnique({
    where: { id: params.id },
    select: { id: true, showcased: true },
  });
  if (!sub || !sub.showcased) {
    return NextResponse.json({ error: '作品未公示' }, { status: 404 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }
  const content = String(body?.content || '').trim().slice(0, 500);
  if (content.length < 1) return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });

  const c = await (prisma as any).showcaseComment.create({
    data: { submissionId: params.id, userId: session.user.id, content },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json(c);
}
