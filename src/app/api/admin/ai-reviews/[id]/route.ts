import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// GET /api/admin/ai-reviews/[id] —— 获取单条 AI 评审详情（含原始响应）
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const r = await (prisma as any).aiReview.findUnique({ where: { id: params.id } });
  if (!r) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  const submission = await prisma.submission.findUnique({
    where: { id: r.submissionId },
    select: { id: true, fileName: true, filePath: true, userId: true, competitionId: true, score: true, feedback: true, status: true },
  });
  const competition = await prisma.competition.findUnique({
    where: { id: r.competitionId },
    select: { id: true, title: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: r.userId },
    select: { id: true, name: true, email: true, school: true, studentId: true },
  });
  return NextResponse.json({ review: r, submission, competition, user });
}
