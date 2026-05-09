import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isSuperAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 备份版本号；未来 schema 演进时可用于迁移逻辑
const BACKUP_VERSION = 1;

// =============== 导出 ===============
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdminRole(session.user.role)) {
    return NextResponse.json({ error: '仅高级管理员可导出备份' }, { status: 403 });
  }

  const [
    users,
    siteConfig,
    guideDocs,
    competitions,
    competitionTemplates,
    announcements,
    teams,
    teamMembers,
    teamJoinRequests,
    submissions,
    showcaseComments,
    showcaseLikes,
    judgeScores,
    notifications,
    loginLogs,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.siteConfig.findMany(),
    (prisma as any).guideDoc.findMany(),
    prisma.competition.findMany(),
    (prisma as any).competitionTemplate.findMany(),
    prisma.announcement.findMany(),
    (prisma as any).team.findMany(),
    (prisma as any).teamMember.findMany(),
    (prisma as any).teamJoinRequest.findMany(),
    prisma.submission.findMany({ orderBy: { createdAt: 'asc' } }),
    (prisma as any).showcaseComment.findMany(),
    (prisma as any).showcaseLike.findMany(),
    (prisma as any).judgeScore.findMany(),
    (prisma as any).notification.findMany(),
    (prisma as any).loginLog.findMany(),
  ]);

  const payload = {
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      competitions: competitions.length,
      submissions: submissions.length,
      teams: teams.length,
    },
    data: {
      users,
      siteConfig,
      guideDocs,
      competitions,
      competitionTemplates,
      announcements,
      teams,
      teamMembers,
      teamJoinRequests,
      submissions,
      showcaseComments,
      showcaseLikes,
      judgeScores,
      notifications,
      loginLogs,
    },
  };

  const json = JSON.stringify(payload);
  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="mcm-backup-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}

// =============== 导入 ===============
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdminRole(session.user.role)) {
    return NextResponse.json({ error: '仅高级管理员可导入备份' }, { status: 403 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: '备份文件不是合法 JSON' }, { status: 400 });
  }

  if (!payload || !payload.data || typeof payload.data !== 'object') {
    return NextResponse.json({ error: '备份文件结构无效（缺少 data）' }, { status: 400 });
  }
  if (payload.backupVersion && payload.backupVersion > BACKUP_VERSION) {
    return NextResponse.json({ error: `备份版本 ${payload.backupVersion} 高于当前系统支持的 ${BACKUP_VERSION}` }, { status: 400 });
  }

  const d = payload.data;
  const arr = (k: string): any[] => (Array.isArray(d[k]) ? d[k] : []);

  // 自我保护：禁止导入到包含当前会话用户被覆盖且无任何超级管理员的备份
  const incomingUsers = arr('users');
  const hasSuperAdmin = incomingUsers.some((u: any) => u.role === 'super_admin');
  if (incomingUsers.length > 0 && !hasSuperAdmin) {
    return NextResponse.json({ error: '备份内不存在 super_admin 用户，导入会导致系统失锁' }, { status: 400 });
  }

  // 字段日期字符串 → Date
  const toDate = (v: any) => (v ? new Date(v) : v);
  const mapDates = (row: any, keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) row[k] = toDate(row[k]);
    }
    return row;
  };

  try {
    await prisma.$transaction(async (tx: any) => {
      // ---- 反向 FK 顺序清空 ----
      await tx.judgeScore.deleteMany({});
      await tx.showcaseLike.deleteMany({});
      await tx.showcaseComment.deleteMany({});
      await tx.notification.deleteMany({});
      await tx.loginLog.deleteMany({});
      await tx.teamJoinRequest.deleteMany({});
      await tx.teamMember.deleteMany({});
      // submission 自引用 parentId：先把所有 parentId 置 null 再删除
      await tx.submission.updateMany({ data: { parentId: null } });
      await tx.submission.deleteMany({});
      await tx.team.deleteMany({});
      await tx.announcement.deleteMany({});
      await tx.competitionTemplate.deleteMany({});
      await tx.competition.deleteMany({});
      await tx.guideDoc.deleteMany({});
      await tx.siteConfig.deleteMany({});
      await tx.user.deleteMany({});

      // ---- FK 顺序写入 ----
      for (const u of arr('users')) {
        await tx.user.create({ data: mapDates({ ...u }, ['createdAt', 'updatedAt']) });
      }
      for (const s of arr('siteConfig')) {
        await tx.siteConfig.create({ data: mapDates({ ...s }, ['updatedAt']) });
      }
      for (const g of arr('guideDocs')) {
        await tx.guideDoc.create({ data: mapDates({ ...g }, ['updatedAt']) });
      }
      for (const c of arr('competitions')) {
        await tx.competition.create({ data: mapDates({ ...c }, ['startTime', 'endTime', 'createdAt', 'updatedAt']) });
      }
      for (const t of arr('competitionTemplates')) {
        await tx.competitionTemplate.create({ data: mapDates({ ...t }, ['createdAt', 'updatedAt']) });
      }
      for (const a of arr('announcements')) {
        await tx.announcement.create({ data: mapDates({ ...a }, ['createdAt', 'updatedAt']) });
      }
      for (const t of arr('teams')) {
        await tx.team.create({ data: mapDates({ ...t }, ['createdAt', 'updatedAt']) });
      }
      for (const m of arr('teamMembers')) {
        await tx.teamMember.create({ data: mapDates({ ...m }, ['joinedAt']) });
      }
      for (const r of arr('teamJoinRequests')) {
        await tx.teamJoinRequest.create({ data: mapDates({ ...r }, ['createdAt', 'updatedAt']) });
      }
      // 提交：先按 createdAt 升序写入，parentId 暂置 null，等全部插入后再回填
      const subs = arr('submissions').slice().sort((a: any, b: any) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return da - db;
      });
      const parentMap: Record<string, string> = {};
      for (const s of subs) {
        if (s.parentId) parentMap[s.id] = s.parentId;
        const row = mapDates({ ...s, parentId: null }, ['createdAt', 'updatedAt']);
        await tx.submission.create({ data: row });
      }
      for (const [id, parentId] of Object.entries(parentMap)) {
        try {
          await tx.submission.update({ where: { id }, data: { parentId } });
        } catch {
          // 父记录不存在则跳过
        }
      }
      for (const c of arr('showcaseComments')) {
        await tx.showcaseComment.create({ data: mapDates({ ...c }, ['createdAt']) });
      }
      for (const l of arr('showcaseLikes')) {
        await tx.showcaseLike.create({ data: mapDates({ ...l }, ['createdAt']) });
      }
      for (const j of arr('judgeScores')) {
        await tx.judgeScore.create({ data: mapDates({ ...j }, ['createdAt', 'updatedAt']) });
      }
      for (const n of arr('notifications')) {
        await tx.notification.create({ data: mapDates({ ...n }, ['createdAt']) });
      }
      for (const log of arr('loginLogs')) {
        await tx.loginLog.create({ data: mapDates({ ...log }, ['createdAt']) });
      }
    }, { timeout: 60_000, maxWait: 10_000 });
  } catch (e: any) {
    console.error('备份导入失败:', e);
    return NextResponse.json({ error: '导入失败：' + (e?.message || '未知错误') }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    counts: {
      users: arr('users').length,
      competitions: arr('competitions').length,
      submissions: arr('submissions').length,
      teams: arr('teams').length,
    },
  });
}
