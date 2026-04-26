import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

// POST: 为当前用户获取或生成订阅 token
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  let token = (user as any).calendarToken as string | null;
  if (!token) {
    token = randomBytes(24).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { calendarToken: token } as any,
    });
  }
  return NextResponse.json({ token });
}
