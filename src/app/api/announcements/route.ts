import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';

    const announcements = await prisma.announcement.findMany({
      where: (all && isAdmin) ? {} : { published: true },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: (all && isAdmin) ? undefined : limit,
    });

    return NextResponse.json(announcements);
  } catch (error) {
    return NextResponse.json({ error: '获取公告失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, pinned, published } = body;

    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        pinned: pinned ?? false,
        published: published ?? true,
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    return NextResponse.json({ error: '创建公告失败' }, { status: 500 });
  }
}
