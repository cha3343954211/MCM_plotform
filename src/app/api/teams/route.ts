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
  const publicList = searchParams.get('public') === '1';

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

  if (publicList && competitionId) {
    const teams = await (prisma as any).team.findMany({
      where: { competitionId },
      select: {
        id: true,
        name: true,
        maxMembers: true,
        leader: { select: { id: true, name: true, school: true } },
        members: { select: { userId: true }, take: 50 },
        joinRequests: { where: { userId: session.user.id, status: 'pending' }, select: { id: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(teams.map((team: any) => ({
      ...team,
      hasPendingRequest: team.joinRequests.length > 0,
      joinRequests: undefined,
    })));
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
            take: 20,
          },
          joinRequests: {
            where: { status: 'pending' },
            include: { user: { select: { id: true, name: true, email: true, school: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    let body: any;
    try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }
    const name = String(body?.name || '').trim().slice(0, 50);
    const competitionId = String(body?.competitionId || '').trim();

    if (!name || !competitionId) {
      return NextResponse.json({ error: '团队名和赛题 id 必填' }, { status: 400 });
    }

    const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) return NextResponse.json({ error: '赛题不存在' }, { status: 404 });
    if (competition.status === 'ended') return NextResponse.json({ error: '赛题已结束' }, { status: 400 });

    // 校验 session 中的 user 真实存在（避免 JWT 仍有效但用户已被删除的 P2003）
    const leader = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { id: true } });
    if (!leader) {
      return NextResponse.json({ error: '账号已失效，请重新登录' }, { status: 401 });
    }

    // 同一赛题下用户不能在多个队
    const existing = await (prisma as any).teamMember.findFirst({
      where: { userId: (session.user as any).id, team: { competitionId } },
    });
    if (existing) {
      return NextResponse.json({ error: '你已在该赛题下加入了其他团队，请先退出' }, { status: 400 });
    }

    // 生成不冲突的邀请码（最多 5 次重试，含 P2002 兜底重试）
    let inviteCode = '';
    for (let i = 0; i < 5; i++) {
      inviteCode = generateInviteCode(6);
      const dup = await (prisma as any).team.findUnique({ where: { inviteCode } });
      if (!dup) break;
      inviteCode = '';
    }
    if (!inviteCode) return NextResponse.json({ error: '生成邀请码失败，请重试' }, { status: 500 });

    // 团队创建（含 P2002 / P2003 兜底重试）
    let team: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        team = await (prisma as any).team.create({
          data: {
            name,
            inviteCode,
            competitionId,
            leaderId: (session.user as any).id,
            maxMembers: Math.max(1, Math.min(20, (competition as any).teamMaxMembers || 5)),
            members: { create: { userId: (session.user as any).id, role: 'leader' } },
          },
          include: {
            members: { include: { user: { select: { id: true, name: true } } } },
            competition: { select: { id: true, title: true } },
          },
        });
        break;
      } catch (e: any) {
        const code = e?.code;
        // P2002 = 唯一约束冲突（邀请码撞车），重生一个再试
        if (code === 'P2002') {
          inviteCode = generateInviteCode(6);
          continue;
        }
        // P2003 = 外键约束失败：把 Prisma 错误转成可读信息
        if (code === 'P2003') {
          const meta = e?.meta;
          const field = meta?.field_name || '';
          let msg = '团队创建失败：';
          if (field.includes('competitionId')) msg += '所选赛题不存在';
          else if (field.includes('leaderId') || field.includes('User')) msg += '当前用户不存在，请重新登录';
          else msg += '数据关联异常，请联系管理员';
          return NextResponse.json({ error: msg, code: 'P2003' }, { status: 400 });
        }
        // 其他错误：透传原始 message 便于排错，但不暴露栈
        console.error('[teams/create] error:', e);
        return NextResponse.json({ error: e?.message || '团队创建失败，请稍后重试' }, { status: 500 });
      }
    }
    if (!team) return NextResponse.json({ error: '团队创建失败，请重试' }, { status: 500 });

    return NextResponse.json(team);
  } catch (e: any) {
    console.error('[teams/create] outer error:', e);
    return NextResponse.json({ error: e?.message || '团队创建失败' }, { status: 500 });
  }
}
