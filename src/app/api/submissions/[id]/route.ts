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
    const { score, feedback, status, award, showcased } = body;

    const data: Record<string, unknown> = {};
    if (score !== undefined && score !== '') {
      const parsed = parseFloat(score);
      if (!isNaN(parsed)) data.score = parsed;
    }
    if (feedback !== undefined) data.feedback = feedback;
    if (status) data.status = status;
    if (award !== undefined) data.award = award || null;
    if (showcased !== undefined) data.showcased = Boolean(showcased);

    const submission = await prisma.submission.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(submission);
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
