import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const requests = await (prisma as any).teamJoinRequest.findMany({
    where: { team: { leaderId: session.user.id }, status: 'pending' },
    include: {
      user: { select: { id: true, name: true, email: true, school: true, studentId: true } },
      team: { select: { id: true, name: true, competition: { select: { id: true, title: true } }, members: true, maxMembers: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(requests);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const teamId = String(body?.teamId || '').trim();
  const message = String(body?.message || '').trim().slice(0, 200);
  if (!teamId) return NextResponse.json({ error: '缺少团队 id' }, { status: 400 });

  const team = await (prisma as any).team.findUnique({
    where: { id: teamId },
    include: { competition: true, members: true },
  });
  if (!team) return NextResponse.json({ error: '团队不存在' }, { status: 404 });
  if (team.competition.status === 'ended') return NextResponse.json({ error: '赛题已结束' }, { status: 400 });
  if (team.members.length >= team.maxMembers) return NextResponse.json({ error: '团队已满员' }, { status: 400 });

  const existingMembership = await (prisma as any).teamMember.findFirst({
    where: { userId: session.user.id, team: { competitionId: team.competitionId } },
  });
  if (existingMembership) return NextResponse.json({ error: '你已在该赛题下加入了团队' }, { status: 400 });

  const requestRow = await (prisma as any).teamJoinRequest.upsert({
    where: { teamId_userId: { teamId, userId: session.user.id } },
    update: { message: message || null, status: 'pending' },
    create: { teamId, userId: session.user.id, message: message || null },
  });

  await (prisma as any).notification.create({
    data: {
      userId: team.leaderId,
      type: 'system',
      title: '新的入队申请',
      content: `${session.user.name} 申请加入你的团队《${team.name}》`,
      link: '/teams',
    },
  }).catch(() => {});

  return NextResponse.json(requestRow);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || '').trim();
  const action = String(body?.action || '').trim();
  if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: '请求参数错误' }, { status: 400 });

  const requestRow = await (prisma as any).teamJoinRequest.findUnique({
    where: { id },
    include: { team: { include: { members: true, competition: true } }, user: true },
  });
  if (!requestRow) return NextResponse.json({ error: '申请不存在' }, { status: 404 });
  if (requestRow.team.leaderId !== session.user.id) return NextResponse.json({ error: '只有队长可审核' }, { status: 403 });
  if (requestRow.status !== 'pending') return NextResponse.json({ error: '该申请已处理' }, { status: 400 });

  if (action === 'reject') {
    await (prisma as any).teamJoinRequest.update({ where: { id }, data: { status: 'rejected' } });
    await (prisma as any).notification.create({
      data: { userId: requestRow.userId, type: 'system', title: '入队申请被拒绝', content: `你加入团队《${requestRow.team.name}》的申请被拒绝`, link: '/teams' },
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (requestRow.team.competition.status === 'ended') return NextResponse.json({ error: '赛题已结束' }, { status: 400 });
  if (requestRow.team.members.length >= requestRow.team.maxMembers) return NextResponse.json({ error: '团队已满员' }, { status: 400 });

  const existingMembership = await (prisma as any).teamMember.findFirst({
    where: { userId: requestRow.userId, team: { competitionId: requestRow.team.competitionId } },
  });
  if (existingMembership) return NextResponse.json({ error: '申请人已加入该赛题下的团队' }, { status: 400 });

  await prisma.$transaction([
    (prisma as any).teamMember.create({ data: { teamId: requestRow.teamId, userId: requestRow.userId, role: 'member' } }),
    (prisma as any).teamJoinRequest.update({ where: { id }, data: { status: 'approved' } }),
  ]);

  await (prisma as any).notification.create({
    data: { userId: requestRow.userId, type: 'system', title: '入队申请已通过', content: `你已加入团队《${requestRow.team.name}》`, link: '/teams' },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
