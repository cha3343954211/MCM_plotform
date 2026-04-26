import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { canReview, isSuperAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// GET /api/judge-scores?submissionId=xxx —— admin 看所有评委对该提交的打分
//                                      —— judge 仅看自己的打分
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get('submissionId');
  if (!submissionId) return NextResponse.json({ error: '需要 submissionId' }, { status: 400 });

  const where: any = { submissionId };
  if (!isSuperAdminRole(session.user.role)) {
    if (!canReview(session.user.role)) return NextResponse.json({ error: '无权限' }, { status: 403 });
    where.judgeId = session.user.id;
  }

  const scores = await (prisma as any).judgeScore.findMany({
    where,
    include: { judge: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // 计算平均分（仅 admin 需要）
  let average: number | null = null;
  if (isSuperAdminRole(session.user.role) && scores.length > 0) {
    const sum = scores.reduce((a: number, s: any) => a + s.score, 0);
    average = Math.round((sum / scores.length) * 100) / 100;
  }

  return NextResponse.json({ scores, average });
}

// POST /api/judge-scores —— 评委或 admin 为某 submission 提交打分（upsert）
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (!canReview(session.user.role)) {
    return NextResponse.json({ error: '只有评委、管理员或高级管理员可打分' }, { status: 403 });
  }

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }
  const submissionId = String(body?.submissionId || '');
  const score = Number(body?.score);
  const feedback = typeof body?.feedback === 'string' ? body.feedback.slice(0, 2000) : null;

  if (!submissionId) return NextResponse.json({ error: '需要 submissionId' }, { status: 400 });
  if (!isFinite(score) || score < 0 || score > 100) {
    return NextResponse.json({ error: '分数必须在 0-100 之间' }, { status: 400 });
  }

  const sub = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!sub) return NextResponse.json({ error: '提交不存在' }, { status: 404 });

  const result = await (prisma as any).judgeScore.upsert({
    where: { submissionId_judgeId: { submissionId, judgeId: session.user.id } },
    update: { score, feedback },
    create: { submissionId, judgeId: session.user.id, score, feedback },
  });

  // 自动重新计算 submission 的最终分（取所有评委均分），admin 后续可手动覆盖
  const all = await (prisma as any).judgeScore.findMany({ where: { submissionId } });
  if (all.length > 0) {
    const avg = all.reduce((a: number, s: any) => a + s.score, 0) / all.length;
    await prisma.submission.update({
      where: { id: submissionId },
      data: { score: Math.round(avg * 100) / 100, status: 'graded' },
    });
  }

  return NextResponse.json(result);
}

// DELETE /api/judge-scores?id=xxx —— 删除自己的打分（admin 可删任意）
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '需要 id' }, { status: 400 });

  const score = await (prisma as any).judgeScore.findUnique({ where: { id } });
  if (!score) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  if (!isSuperAdminRole(session.user.role) && score.judgeId !== session.user.id) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  await (prisma as any).judgeScore.delete({ where: { id } });

  // 重新计算均分
  const remaining = await (prisma as any).judgeScore.findMany({ where: { submissionId: score.submissionId } });
  if (remaining.length > 0) {
    const avg = remaining.reduce((a: number, s: any) => a + s.score, 0) / remaining.length;
    await prisma.submission.update({
      where: { id: score.submissionId },
      data: { score: Math.round(avg * 100) / 100 },
    });
  } else {
    await prisma.submission.update({
      where: { id: score.submissionId },
      data: { score: null, status: 'pending' },
    });
  }
  return NextResponse.json({ ok: true });
}
