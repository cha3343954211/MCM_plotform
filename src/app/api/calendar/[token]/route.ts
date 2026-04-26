import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function icsEscape(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function fmtDate(d: Date): string {
  // UTC ICS format: YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// GET /api/calendar/[token].ics  —— 返回该用户订阅的所有 active 赛题截止时间
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const raw = params.token || '';
  const token = raw.replace(/\.ics$/i, '');

  if (!/^[a-f0-9]{32,128}$/i.test(token)) {
    return new Response('invalid token', { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { calendarToken: token } as any });
  if (!user) return new Response('not found', { status: 404 });

  const comps = await prisma.competition.findMany({
    where: { status: { in: ['active', 'draft'] } },
    orderBy: { endTime: 'asc' },
  });

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MathoiMCM//Competition Calendar//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:数学建模赛题',
    'X-WR-TIMEZONE:Asia/Shanghai',
  ];

  const dtstamp = fmtDate(new Date());
  for (const c of comps) {
    // 截止事件（30 分钟提醒 + 1 小时事件块）
    const end = new Date(c.endTime);
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:competition-end-${c.id}@mathoi-mcm`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${fmtDate(start)}`,
      `DTEND:${fmtDate(end)}`,
      `SUMMARY:${icsEscape('截止：' + c.title)}`,
      `DESCRIPTION:${icsEscape((c.description || '').slice(0, 500))}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape('赛题即将截止：' + c.title)}`,
      'END:VALARM',
      'END:VEVENT',
    );

    // 开始事件
    const startTime = new Date(c.startTime);
    const startEnd = new Date(startTime.getTime() + 30 * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:competition-start-${c.id}@mathoi-mcm`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${fmtDate(startTime)}`,
      `DTEND:${fmtDate(startEnd)}`,
      `SUMMARY:${icsEscape('开始：' + c.title)}`,
      `DESCRIPTION:${icsEscape((c.description || '').slice(0, 500))}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
