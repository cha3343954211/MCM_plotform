import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/teams/[id] —— 团队详情（仅成员或 admin）
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const team = await (prisma as any).team.findUnique({
    where: { id: params.id },
    include: {
      competition: { select: { id: true, title: true, status: true, endTime: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, school: true, studentId: true } } },
      },
      submissions: {
        where: { isLatest: true },
        select: { id: true, fileName: true, status: true, score: true, award: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!team) return NextResponse.json({ error: '团队不存在' }, { status: 404 });

  const isMember = team.members.some((m: any) => m.userId === session.user.id);
  if (!isMember && session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  return NextResponse.json(team);
}

// PATCH /api/teams/[id] —— 队长修改团队名 / 移除成员
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const team = await (prisma as any).team.findUnique({ where: { id: params.id } });
  if (!team) return NextResponse.json({ error: '团队不存在' }, { status: 404 });

  const isLeader = team.leaderId === session.user.id;
  const isAdmin = session.user.role === 'admin';
  if (!isLeader && !isAdmin) return NextResponse.json({ error: '只有队长可操作' }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  // 移除成员
  if (body.action === 'kick' && typeof body.userId === 'string') {
    if (body.userId === team.leaderId) return NextResponse.json({ error: '不能移除队长' }, { status: 400 });
    await (prisma as any).teamMember.delete({
      where: { teamId_userId: { teamId: team.id, userId: body.userId } },
    });
    return NextResponse.json({ ok: true });
  }

  // 修改信息
  const data: any = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 50);
  if (typeof body.maxMembers === 'number') data.maxMembers = Math.max(1, Math.min(20, body.maxMembers));
  if (Object.keys(data).length === 0) return NextResponse.json({ error: '无可更新字段' }, { status: 400 });

  const updated = await (prisma as any).team.update({ where: { id: team.id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/teams/[id] —— 队长解散，或成员退出
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const team = await (prisma as any).team.findUnique({
    where: { id: params.id },
    include: { members: true },
  });
  if (!team) return NextResponse.json({ error: '团队不存在' }, { status: 404 });

  const isLeader = team.leaderId === session.user.id;
  const isAdmin = session.user.role === 'admin';
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || (isLeader || isAdmin ? 'disband' : 'leave');

  if (action === 'disband') {
    if (!isLeader && !isAdmin) return NextResponse.json({ error: '只有队长可解散' }, { status: 403 });
    // 把该团队下的 submissions teamId 解除（不删除提交）
    await prisma.submission.updateMany({
      where: { teamId: team.id } as any,
      data: { teamId: null } as any,
    });
    await (prisma as any).team.delete({ where: { id: team.id } });
    return NextResponse.json({ ok: true, action: 'disband' });
  }

  // leave：成员退出
  if (team.leaderId === session.user.id) {
    return NextResponse.json({ error: '队长不能退出，请先转让队长或解散团队' }, { status: 400 });
  }
  await (prisma as any).teamMember.delete({
    where: { teamId_userId: { teamId: team.id, userId: session.user.id } },
  });
  return NextResponse.json({ ok: true, action: 'leave' });
}
