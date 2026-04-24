import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        school: true,
        studentId: true,
        phone: true,
        createdAt: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // BOM for Excel to correctly read UTF-8
    const BOM = '\uFEFF';
    const headers = ['姓名', '邮箱', '角色', '学校', '学号', '手机', '提交数', '注册时间'];
    const rows = users.map((u) => [
      u.name,
      u.email,
      u.role === 'admin' ? '管理员' : '用户',
      u.school || '',
      u.studentId || '',
      u.phone || '',
      String(u._count?.submissions || 0),
      new Date(u.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    ]);

    const csvContent = BOM + [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="users_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('导出用户失败:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
