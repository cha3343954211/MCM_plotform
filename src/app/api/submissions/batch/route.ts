import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

async function safeUnlinkUpload(relPath: string | null | undefined) {
  if (!relPath) return;
  try {
    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const abs = path.normalize(path.join(process.cwd(), 'public', relPath));
    if (!abs.startsWith(uploadsRoot)) return;
    await unlink(abs);
  } catch {}
}

const ALLOWED_AWARDS = new Set(['special', 'first', 'second', 'third', 'excellent', null]);

/**
 * POST /api/submissions/batch
 * Body: { ids: string[], action: 'grade'|'award'|'showcase'|'delete', payload?: any }
 *  - grade:   payload.score (number, optional), payload.feedback (string, optional)
 *  - award:   payload.award (string|null), payload.showcase (boolean, optional)
 *  - showcase:payload.showcased (boolean)
 *  - delete:  no payload
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string') : [];
    const action: string = body?.action;
    const payload: any = body?.payload || {};

    if (ids.length === 0) {
      return NextResponse.json({ error: '请选择至少一条提交' }, { status: 400 });
    }
    if (ids.length > 200) {
      return NextResponse.json({ error: '单次操作不能超过 200 条' }, { status: 400 });
    }

    if (action === 'grade') {
      const data: any = {};
      if (typeof payload.score === 'number' && isFinite(payload.score)) {
        data.score = Math.max(0, Math.min(100, payload.score));
        data.status = 'graded';
      }
      if (typeof payload.feedback === 'string') {
        data.feedback = payload.feedback.slice(0, 2000);
      }
      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: '请提供分数或评语' }, { status: 400 });
      }
      const result = await prisma.submission.updateMany({ where: { id: { in: ids } }, data });
      // 给被打分的用户发通知
      if (data.score !== undefined) {
        try {
          const subs = await prisma.submission.findMany({
            where: { id: { in: ids } },
            select: { userId: true, competition: { select: { title: true, id: true } } },
          });
          await Promise.all(subs.map((s) =>
            (prisma as any).notification.create({
              data: {
                userId: s.userId,
                type: 'graded',
                title: '你的提交已评分',
                content: `《${s.competition.title}》得分：${data.score}`,
                link: `/competitions/${s.competition.id}`,
              },
            }).catch(() => {})
          ));
        } catch {}
      }
      return NextResponse.json({ ok: true, count: result.count });
    }

    if (action === 'award') {
      const award = payload.award === null ? null : String(payload.award || '');
      if (!ALLOWED_AWARDS.has(award)) {
        return NextResponse.json({ error: '奖项参数不合法' }, { status: 400 });
      }
      const data: any = { award };
      if (typeof payload.showcase === 'boolean') data.showcased = payload.showcase;
      const result = await prisma.submission.updateMany({ where: { id: { in: ids } }, data });
      return NextResponse.json({ ok: true, count: result.count });
    }

    if (action === 'showcase') {
      if (typeof payload.showcased !== 'boolean') {
        return NextResponse.json({ error: '需要 showcased 布尔值' }, { status: 400 });
      }
      const result = await prisma.submission.updateMany({
        where: { id: { in: ids } },
        data: { showcased: payload.showcased },
      });
      return NextResponse.json({ ok: true, count: result.count });
    }

    if (action === 'delete') {
      // 需要逐条删除以清理文件
      const subs = await prisma.submission.findMany({
        where: { id: { in: ids } },
        select: { id: true, filePath: true, extraFiles: true, userId: true, competitionId: true, isLatest: true, parentId: true },
      });
      for (const s of subs) {
        await safeUnlinkUpload(s.filePath);
        if (s.extraFiles) {
          try {
            const arr = JSON.parse(s.extraFiles) as { path: string }[];
            for (const ef of arr) await safeUnlinkUpload(ef.path);
          } catch {}
        }
      }
      await prisma.submission.deleteMany({ where: { id: { in: ids } } });

      // 修复 isLatest：如果删除后某 (user, competition) 没有 isLatest 但还有其他版本，把最新版置为 isLatest
      const groups = new Map<string, { userId: string; competitionId: string }>();
      for (const s of subs) {
        if (s.isLatest) groups.set(`${s.userId}::${s.competitionId}`, { userId: s.userId, competitionId: s.competitionId });
      }
      for (const g of Array.from(groups.values())) {
        const remaining = await prisma.submission.findFirst({
          where: { userId: g.userId, competitionId: g.competitionId },
          orderBy: { createdAt: 'desc' },
        });
        if (remaining) {
          await prisma.submission.update({
            where: { id: remaining.id },
            data: { isLatest: true } as any,
          });
        }
      }

      return NextResponse.json({ ok: true, count: subs.length });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('批量操作失败:', error);
    return NextResponse.json({ error: '批量操作失败' }, { status: 500 });
  }
}
