import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';
import bcrypt from 'bcryptjs';

function randomPassword(length = 10) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    let newPassword: string = body?.newPassword;

    if (!newPassword) {
      newPassword = randomPassword(10);
    } else if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: '密码长度至少 6 位' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: params.id }, data: { password: hashed } });

    return NextResponse.json({ message: '密码已重置', newPassword });
  } catch (error) {
    console.error('重置密码失败:', error);
    return NextResponse.json({ error: '重置失败' }, { status: 500 });
  }
}
