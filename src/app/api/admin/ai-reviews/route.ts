import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';
import { runAiReview } from '@/lib/aiReview';

export const dynamic = 'force-dynamic';

// GET /api/admin/ai-reviews?submissionId=&competitionId=&status=&limit=
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get('submissionId') || undefined;
  const competitionId = searchParams.get('competitionId') || undefined;
  const status = searchParams.get('status') || undefined;
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const where: any = {};
  if (submissionId) where.submissionId = submissionId;
  if (competitionId) where.competitionId = competitionId;
  if (status) where.status = status;

  const reviews = await (prisma as any).aiReview.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      // 通过关联关系不可用，所以手动再查
    },
  });

  // 关联展示用的提交者与赛题
  const subIds: string[] = Array.from(new Set<string>(reviews.map((r: any) => r.submissionId).filter(Boolean)));
  const compIds: string[] = Array.from(new Set<string>(reviews.map((r: any) => r.competitionId).filter(Boolean)));
  const userIds: string[] = Array.from(new Set<string>(reviews.map((r: any) => r.userId).filter(Boolean)));
  const [subs, comps, users] = await Promise.all([
    subIds.length ? prisma.submission.findMany({ where: { id: { in: subIds } }, select: { id: true, fileName: true, userId: true, competitionId: true } }) : [],
    compIds.length ? prisma.competition.findMany({ where: { id: { in: compIds } }, select: { id: true, title: true } }) : [],
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, school: true } }) : [],
  ]);
  const subMap = new Map(subs.map((s: any) => [s.id, s]));
  const compMap = new Map(comps.map((c: any) => [c.id, c]));
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  const enriched = reviews.map((r: any) => ({
    ...r,
    submission: subMap.get(r.submissionId) || null,
    competition: compMap.get(r.competitionId) || null,
    user: userMap.get(r.userId) || null,
  }));

  return NextResponse.json({ reviews: enriched, total: enriched.length });
}

// POST /api/admin/ai-reviews —— body: { submissionId }
// 触发一次 AI 评审（可能耗时数十秒，直接同步返回结果）
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }
  const submissionId = String(body?.submissionId || '');
  if (!submissionId) return NextResponse.json({ error: '需要 submissionId' }, { status: 400 });

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) return NextResponse.json({ error: '提交不存在' }, { status: 404 });

  try {
    const { reviewId, status, result, error } = await runAiReview(submissionId, {
      adminId: (session.user as any).id,
      adminName: (session.user as any).name,
    });
    return NextResponse.json({ reviewId, status, result, error });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI 评审失败' }, { status: 500 });
  }
}
