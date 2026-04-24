import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

async function tryUnlink(relPath: string | null | undefined) {
  if (!relPath) return;
  try { await unlink(path.join(process.cwd(), 'public', relPath)); } catch {}
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { score, feedback, status, award, showcased } = body;

    const data: Record<string, unknown> = {};
    if (score !== undefined && score !== '') {
      const parsed = parseFloat(score);
      if (!isNaN(parsed)) data.score = parsed;
    }
    if (feedback !== undefined) data.feedback = feedback;
    if (status) data.status = status;
    if (award !== undefined) data.award = award || null;
    if (showcased !== undefined) data.showcased = Boolean(showcased);

    const before = await prisma.submission.findUnique({
      where: { id: params.id },
      include: { competition: { select: { title: true } } },
    });

    const submission = await prisma.submission.update({
      where: { id: params.id },
      data,
    });

    // 评分结果变化 → 给提交者创建通知
    try {
      const scoreChanged = data.score !== undefined && data.score !== before?.score;
      const awardChanged = data.award !== undefined && data.award !== before?.award;
      const feedbackAdded = data.feedback !== undefined && data.feedback && data.feedback !== before?.feedback;
      if (before && (scoreChanged || awardChanged || feedbackAdded)) {
        const parts: string[] = [];
        if (scoreChanged) parts.push(`成绩 ${submission.score ?? '-'} 分`);
        if (awardChanged && submission.award) parts.push(`奖项: ${submission.award}`);
        await (prisma as any).notification.create({
          data: {
            userId: before.userId,
            type: 'graded',
            title: `你的提交已被评分: ${before.competition?.title || ''}`,
            content: parts.join(' · ') || '管理员已更新你的提交评分',
            link: '/my-submissions',
          },
        });
      }
    } catch (e) {
      console.error('创建评分通知失败:', e);
    }

    return NextResponse.json(submission);
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    });

    if (!submission) {
      return NextResponse.json({ error: '提交不存在' }, { status: 404 });
    }

    const isOwner = submission.userId === session.user.id;
    const isAdmin = session.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: '无权删除他人提交' }, { status: 403 });
    }

    // Only admins can delete graded submissions; users can only delete their own ungraded ones
    if (!isAdmin && submission.status === 'graded') {
      return NextResponse.json({ error: '已评分的提交无法删除，请联系管理员' }, { status: 403 });
    }

    // Delete files from disk
    await tryUnlink(submission.filePath);
    if (submission.extraFiles) {
      try {
        const extras = JSON.parse(submission.extraFiles) as { path: string }[];
        await Promise.all(extras.map((f) => tryUnlink(f.path)));
      } catch {}
    }

    await prisma.submission.delete({ where: { id: params.id } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除提交错误:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
