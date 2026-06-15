import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';
import { isAdminRole, isSuperAdminRole } from '@/lib/roles';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, school, studentId, phone } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) {
      const allowedRoles = new Set(['user', 'judge', 'admin', 'super_admin']);
      if (!allowedRoles.has(role)) return NextResponse.json({ error: '角色不合法' }, { status: 400 });
      const superCount = await prisma.user.count({ where: { role: 'super_admin' } });
      const canSetRole = isSuperAdminRole(session.user.role) || (role === 'super_admin' && superCount === 0);
      if (!canSetRole) return NextResponse.json({ error: '只有高级管理员可修改角色' }, { status: 403 });
      data.role = role;
    }
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
    if (!session || !isAdminRole(session.user.role)) {
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

    // 事务化：清空 submission 后删 user，避免 FK RESTRICT 失败时残留脏数据
    try {
      await prisma.$transaction([
        prisma.submission.deleteMany({ where: { userId: params.id } }),
        // 团队关联以 Cascade 自动清理（leaderId/TeamMember/TeamJoinRequest 均为 Cascade）
        prisma.user.delete({ where: { id: params.id } }),
      ]);
    } catch (e: any) {
      // 兜底：若 user 持有 RESTRICT 关系（例如其他系统表），则明确报错
      return NextResponse.json(
        { error: '删除用户失败：' + (e?.message || '存在关联数据无法删除') },
        { status: 500 }
      );
    }
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
