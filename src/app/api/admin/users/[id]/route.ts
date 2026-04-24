import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

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
    const { name, email, role, school, studentId, phone } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (school !== undefined) data.school = school || null;
    if (studentId !== undefined) data.studentId = studentId || null;
    if (phone !== undefined) data.phone = phone || null;

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        school: true, studentId: true, phone: true, createdAt: true,
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '邮箱已被使用' }, { status: 400 });
    }
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
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

    if (params.id === session.user.id) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
    }

    // 删除用户的提交文件
    const submissions = await prisma.submission.findMany({
      where: { userId: params.id },
      select: { filePath: true },
    });
    for (const sub of submissions) {
      try { await unlink(path.join(process.cwd(), 'public', sub.filePath)); } catch {}
    }

    await prisma.submission.deleteMany({ where: { userId: params.id } });
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
