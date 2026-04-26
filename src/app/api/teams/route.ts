import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateInviteCode } from '@/lib/inviteCode';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// GET /api/teams?competitionId=xxx —— 列出我隶属的团队
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const competitionId = searchParams.get('competitionId') || undefined;
  const admin = searchParams.get('admin') === '1';

  if (admin && isAdminRole(session.user.role)) {
    const teams = await (prisma as any).team.findMany({
      where: competitionId ? { competitionId } : {},
      include: {
        competition: { select: { id: true, title: true, status: true, endTime: true } },
        leader: { select: { id: true, name: true, email: true, school: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, school: true, studentId: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        submissions: {
          where: { isLatest: true },
          select: {
            id: true,
            fileName: true,
            filePath: true,
            extraFiles: true,
            status: true,
            score: true,
            award: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { submissions: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return NextResponse.json(teams);
  }

  const memberships = await (prisma as any).teamMember.findMany({
    where: {
      userId: session.user.id,
      ...(competitionId ? { team: { competitionId } } : {}),
    },
    include: {
      team: {
        include: {
          competition: { select: { id: true, title: true, status: true, endTime: true } },
          members: {
            include: { user: { select: { id: true, name: true, email: true, school: true } } },
          },
          submissions: {
            where: { isLatest: true },
            select: {
              id: true,
              fileName: true,
              filePath: true,
              extraFiles: true,
              status: true,
              score: true,
              award: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          _count: { select: { submissions: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return NextResponse.json(memberships.map((m: any) => ({
    membershipRole: m.role,
    joinedAt: m.joinedAt,
    team: m.team,
  })));
}

// POST /api/teams —— 创建团队（需指定 competitionId）
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }
  const name = String(body?.name || '').trim().slice(0, 50);
  const competitionId = String(body?.competitionId || '').trim();
  const maxMembers = Math.max(1, Math.min(20, Number(body?.maxMembers) || 5));

  if (!name || !competitionId) {
    return NextResponse.json({ error: '团队名和赛题 id 必填' }, { status: 400 });
  }

  const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!competition) return NextResponse.json({ error: '赛题不存在' }, { status: 404 });
  if (competition.status === 'ended') return NextResponse.json({ error: '赛题已结束' }, { status: 400 });

  // 同一赛题下用户不能在多个队
  const existing = await (prisma as any).teamMember.findFirst({
    where: { userId: session.user.id, team: { competitionId } },
  });
  if (existing) {
    return NextResponse.json({ error: '你已在该赛题下加入了其他团队，请先退出' }, { status: 400 });
  }

  // 生成不冲突的邀请码（最多 5 次重试）
  let inviteCode = '';
  for (let i = 0; i < 5; i++) {
    inviteCode = generateInviteCode(6);
    const dup = await (prisma as any).team.findUnique({ where: { inviteCode } });
    if (!dup) break;
    inviteCode = '';
  }
  if (!inviteCode) return NextResponse.json({ error: '生成邀请码失败，请重试' }, { status: 500 });

  const team = await (prisma as any).team.create({
    data: {
      name,
      inviteCode,
      competitionId,
      leaderId: session.user.id,
      maxMembers,
      members: { create: { userId: session.user.id, role: 'leader' } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      competition: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(team);
}
