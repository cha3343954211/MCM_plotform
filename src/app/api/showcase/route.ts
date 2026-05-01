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

    // 仅在允许下载时才暴露 filePath / fileName / extraFiles，防止未开放的论文被猜测下载
    const sanitized = (submissions as any[]).map((s) => {
      if (!s.showcaseDownloadable) {
        return { ...s, fileName: undefined, filePath: undefined, extraFiles: undefined };
      }
      let extras: { name: string; path: string }[] = [];
      if (s.extraFiles) {
        try {
          const arr = JSON.parse(s.extraFiles);
          if (Array.isArray(arr)) extras = arr.filter((x: any) => x && typeof x.path === 'string');
        } catch {}
      }
      return { ...s, extraFiles: extras };
    });
    return NextResponse.json(sanitized);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
