import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  try {
    const userId = session.user.id;

    const submissions = await prisma.submission.findMany({
      where: { userId, isLatest: true } as any,
      include: {
        competition: { select: { id: true, title: true, status: true, endTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = submissions.length;
    const graded = submissions.filter((s) => s.status === 'graded');
    const scores = graded.map((s) => s.score!).filter((v): v is number => typeof v === 'number');
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const best = scores.length > 0 ? Math.max(...scores) : null;

    const awards = submissions.filter((s) => s.award).map((s) => ({
      submissionId: s.id,
      competitionTitle: s.competition.title,
      competitionId: s.competition.id,
      award: s.award,
      score: s.score,
      createdAt: s.createdAt,
    }));

    // 成绩曲线（按提交时间升序）
    const trend = graded
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((s) => ({
        date: new Date(s.createdAt).toISOString().slice(0, 10),
        score: s.score,
        title: s.competition.title,
      }));

    const recent = submissions.slice(0, 8).map((s) => ({
      id: s.id,
      competitionTitle: s.competition.title,
      competitionId: s.competition.id,
      status: s.status,
      score: s.score,
      award: s.award,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      total,
      gradedCount: graded.length,
      averageScore: avg !== null ? Math.round(avg * 100) / 100 : null,
      bestScore: best,
      awards,
      trend,
      recent,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '获取成绩失败' }, { status: 500 });
  }
}
