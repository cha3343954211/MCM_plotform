import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [
      userTotal,
      userToday,
      compsActive,
      compsDraft,
      compsEnded,
      submissionTotal,
      submissionPending,
      submissionToday,
      pendingByComp,
      submissions7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.competition.count({ where: { status: 'active' } }),
      prisma.competition.count({ where: { status: 'draft' } }),
      prisma.competition.count({ where: { status: 'ended' } }),
      prisma.submission.count({ where: { isLatest: true } as any }),
      prisma.submission.count({ where: { isLatest: true, status: 'pending' } as any }),
      prisma.submission.count({ where: { createdAt: { gte: startOfDay } } }),
      // 各赛题待评分数量（前 5）
      prisma.submission.groupBy({
        by: ['competitionId'],
        where: { isLatest: true, status: 'pending' } as any,
        _count: { _all: true },
        orderBy: { _count: { competitionId: 'desc' } },
        take: 5,
      }),
      // 最近 7 天每天的提交数（仅最新版本）
      prisma.submission.findMany({
        where: { isLatest: true, createdAt: { gte: sevenDaysAgo } } as any,
        select: { createdAt: true },
      }),
    ]);

    // 把 7 天数据按天聚合
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }
    for (const s of submissions7d) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      if (dailyMap.has(key)) dailyMap.set(key, dailyMap.get(key)! + 1);
    }
    const daily = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    // 关联赛题标题
    const compIds = pendingByComp.map((p: any) => p.competitionId);
    const comps = compIds.length > 0
      ? await prisma.competition.findMany({ where: { id: { in: compIds } }, select: { id: true, title: true } })
      : [];
    const compTitleMap = new Map(comps.map((c) => [c.id, c.title]));
    const pendingTop = pendingByComp.map((p: any) => ({
      competitionId: p.competitionId,
      title: compTitleMap.get(p.competitionId) || '未知赛题',
      count: p._count._all,
    }));

    return NextResponse.json({
      users: { total: userTotal, today: userToday },
      competitions: { active: compsActive, draft: compsDraft, ended: compsEnded },
      submissions: { total: submissionTotal, pending: submissionPending, today: submissionToday },
      pendingTop,
      daily,
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    return NextResponse.json({ error: '获取仪表盘数据失败' }, { status: 500 });
  }
}
