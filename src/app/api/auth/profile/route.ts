import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, role: true,
        school: true, studentId: true, phone: true, createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, school, studentId, phone } = body;

    const data: Record<string, string | null> = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (school !== undefined) data.school = school || null;
    if (studentId !== undefined) data.studentId = studentId || null;
    if (phone !== undefined) data.phone = phone || null;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        school: true, studentId: true, phone: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('更新资料失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
