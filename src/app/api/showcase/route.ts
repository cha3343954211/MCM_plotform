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

    // 仅在允许下载时才暴露 filePath / fileName，防止未开放的论文被猜测下载
    const sanitized = (submissions as any[]).map((s) => ({
      ...s,
      fileName: s.showcaseDownloadable ? s.fileName : undefined,
      filePath: s.showcaseDownloadable ? s.filePath : undefined,
    }));
    return NextResponse.json(sanitized);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
