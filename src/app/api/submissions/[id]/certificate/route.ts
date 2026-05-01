import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole, canReview } from '@/lib/roles';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, school: true, studentId: true } },
      competition: { select: { id: true, title: true, endTime: true } },
      team: {
        select: {
          id: true,
          name: true,
          members: {
            include: { user: { select: { id: true, name: true, school: true } } },
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
    },
  });

  if (!submission) return NextResponse.json({ error: '提交不存在' }, { status: 404 });
  if (!submission.award) return NextResponse.json({ error: '该提交未获奖，无法生成证书' }, { status: 400 });

  // 访问权限：本人 / 团队成员 / 管理员 / 评委
  const isOwner = submission.userId === session.user.id;
  const isAdmin = isAdminRole(session.user.role);
  const isReviewer = canReview(session.user.role);
  const teamMembers = submission.team?.members?.map((m: any) => m.userId) || [];
  const isTeamMember = teamMembers.includes(session.user.id);
  if (!isOwner && !isAdmin && !isReviewer && !isTeamMember) {
    return NextResponse.json({ error: '无权查看该证书' }, { status: 403 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } }).catch(() => null);

  // 生成稳定校验码：sha1(id + competitionId)[:10]
  const code = 'CERT-' + crypto
    .createHash('sha1')
    .update(submission.id + ':' + submission.competitionId)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();

  // 颁发日期：优先 updatedAt（最近一次评分/授奖），其次赛题截止时间
  const issuedAt = (submission as any).updatedAt || submission.competition.endTime;

  return NextResponse.json({
    id: submission.id,
    siteName: config?.siteName || '数学建模竞赛平台',
    primaryColor: config?.primaryColor || '#2563eb',
    secondaryColor: config?.secondaryColor || null,
    competitionTitle: submission.competition.title,
    award: submission.award,
    score: submission.score,
    issuedAt,
    code,
    awardee: submission.team
      ? {
          type: 'team',
          name: submission.team.name,
          members: submission.team.members.map((m: any) => ({ name: m.user.name, school: m.user.school })),
        }
      : {
          type: 'user',
          name: submission.user.name,
          school: submission.user.school || '',
          studentId: submission.user.studentId || '',
        },
  });
}
