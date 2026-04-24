import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const { title, content, pinned, published } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (pinned !== undefined) data.pinned = pinned;
    if (published !== undefined) data.published = published;

    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(announcement);
  } catch (error) {
    return NextResponse.json({ error: '更新公告失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    await prisma.announcement.delete({ where: { id: params.id } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: '删除公告失败' }, { status: 500 });
  }
}
