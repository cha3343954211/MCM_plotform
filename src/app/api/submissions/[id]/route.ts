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
    const { score, feedback, status } = body;

    const submission = await prisma.submission.update({
      where: { id: params.id },
      data: {
        ...(score !== undefined && { score: parseFloat(score) }),
        ...(feedback !== undefined && { feedback }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(submission);
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
