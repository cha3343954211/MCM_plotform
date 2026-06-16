// 批量获取多个提交的最新一条 AI 评审（评委用）
// GET /api/judge/ai-reviews/latest?submissionIds=a,b,c
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { canReview } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    if (!session || !canReview((session.user as any)?.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    const idsParam = request.nextUrl.searchParams.get('submissionIds') || '';
    const ids = Array.from(new Set(idsParam.split(',').map((s) => s.trim()).filter(Boolean)));
    if (ids.length === 0) return NextResponse.json({ latest: {} });
    if (ids.length > 500) return NextResponse.json({ error: '一次最多 500 个提交' }, { status: 400 });

    try {
      const groups = await (prisma as any).aiReview.groupBy({
        by: ['submissionId'],
        where: { submissionId: { in: ids } },
        _max: { createdAt: true },
      });
      if (groups.length === 0) return NextResponse.json({ latest: {} });
      const latestPerSub = new Map<string, Date>(groups.map((g: any) => [g.submissionId, g._max.createdAt]));
      const orClauses = Array.from(latestPerSub.entries()).map(([sid, t]) => ({ submissionId: sid, createdAt: t }));
      const rows = await (prisma as any).aiReview.findMany({ where: { OR: orClauses } });
      const map: Record<string, any> = {};
      for (const r of rows) map[r.submissionId] = r;
      return NextResponse.json({ latest: map });
    } catch (e: any) {
      console.error('[judge-ai-reviews-latest] query error:', e);
      return NextResponse.json({ latest: {}, _warning: `数据库读取失败：${e?.message || '未知错误'}` });
    }
  } catch (e: any) {
    return NextResponse.json({ error: `GET 失败：${e?.message || '未知错误'}` }, { status: 200 });
  }
}
