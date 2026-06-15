import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/teams/join { inviteCode }
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }
  const inviteCode = String(body?.inviteCode || '').trim().toUpperCase();
  if (!inviteCode) return NextResponse.json({ error: '请输入邀请码' }, { status: 400 });

  const team = await (prisma as any).team.findUnique({
    where: { inviteCode },
    include: { competition: true },
  });
  if (!team) return NextResponse.json({ error: '邀请码无效' }, { status: 404 });
  if (team.competition.status === 'ended') return NextResponse.json({ error: '赛题已结束' }, { status: 400 });

  // 同赛题下不能加入多个队
  const existing = await (prisma as any).teamMember.findFirst({
    where: { userId: session.user.id, team: { competitionId: team.competitionId } },
  });
  if (existing) {
    if (existing.teamId === team.id) {
      return NextResponse.json({ error: '你已在该团队中' }, { status: 400 });
    }
    return NextResponse.json({ error: '你已在该赛题下加入了其他团队，请先退出' }, { status: 400 });
  }

  // 事务化「校验满员 + 写入成员」避免 TOCTOU 竞争导致超员
  try {
    await prisma.$transaction(async (tx: any) => {
      const count = await tx.teamMember.count({ where: { teamId: team.id } });
      if (count >= team.maxMembers) {
        const e: any = new Error('团队已满员');
        e.status = 400;
        throw e;
      }
      await tx.teamMember.create({
        data: { teamId: team.id, userId: session.user.id, role: 'member' },
      });
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '加入失败' },
      { status: e?.status || 500 }
    );
  }

  // 通知队长
  await (prisma as any).notification.create({
    data: {
      userId: team.leaderId,
      type: 'system',
      title: '新成员加入',
      content: `${session.user.name} 加入了你的团队《${team.name}》`,
      link: `/teams`,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, teamId: team.id });
}
