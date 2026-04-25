import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { title, content, type = 'system', link, mode = 'all', userIds = [] } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: '通知标题不能为空' }, { status: 400 });
    }
    if (title.trim().length > 200) {
      return NextResponse.json({ error: '标题过长，最多 200 字符' }, { status: 400 });
    }
    if (content && typeof content === 'string' && content.length > 2000) {
      return NextResponse.json({ error: '内容过长，最多 2000 字符' }, { status: 400 });
    }

    const MAX_BATCH = 500;

    let targetUserIds: string[] = [];

    if (mode === 'all') {
      const allUsers = await prisma.user.findMany({
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: MAX_BATCH,
      });
      targetUserIds = allUsers.map((u) => u.id);
    } else if (mode === 'users') {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ error: '请选择至少一名用户' }, { status: 400 });
      }
      if (userIds.length > MAX_BATCH) {
        return NextResponse.json({ error: `单次最多发送给 ${MAX_BATCH} 名用户` }, { status: 400 });
      }
      // 验证用户是否存在
      const existing = await prisma.user.findMany({
        where: { id: { in: userIds.slice(0, MAX_BATCH) } },
        select: { id: true },
      });
      targetUserIds = existing.map((u) => u.id);
      if (targetUserIds.length === 0) {
        return NextResponse.json({ error: '所选用户不存在' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: '无效的发送模式' }, { status: 400 });
    }

    const notificationData = {
      type: String(type).slice(0, 50),
      title: title.trim(),
      content: content ? content.trim() : null,
      link: link ? String(link).slice(0, 500) : null,
    };

    // 使用事务批量创建通知
    const result = await prisma.$transaction(
      targetUserIds.map((userId) =>
        (prisma as any).notification.create({
          data: { ...notificationData, userId },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      count: result.length,
      mode,
    });
  } catch (error) {
    console.error('发送通知失败:', error);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}
