import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200', 10) || 200, 1), 1000);
    const successParam = searchParams.get('success');
    const emailFilter = searchParams.get('email') || undefined;

    const where: any = {};
    if (successParam === 'true') where.success = true;
    if (successParam === 'false') where.success = false;
    if (emailFilter) where.email = { contains: emailFilter };

    const logs = await (prisma as any).loginLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: '获取登录日志失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await (prisma as any).loginLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    return NextResponse.json({ error: '清理日志失败' }, { status: 500 });
  }
}
