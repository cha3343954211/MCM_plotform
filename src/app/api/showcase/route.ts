import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // @ts-ignore — showcased field exists after prisma db push but TS client may not be regenerated yet
    const submissions = await (prisma.submission as any).findMany({
      where: {
        showcased: true,
        award: { not: null },
      },
      include: {
        user: { select: { name: true, school: true } },
        competition: { select: { title: true, id: true } },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    return NextResponse.json(submissions);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
