import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { validateUpload } from '@/lib/fileType';

async function getSiteConfig() {
  try {
    return await prisma.siteConfig.findUnique({ where: { id: 'default' } });
  } catch { return null; }
}

async function getMaxFileSize(): Promise<number> {
  const config = await getSiteConfig();
  return ((config as any)?.maxFileSize || 10) * 1024 * 1024;
}

async function getMaxVersions(): Promise<number> {
  const config = await getSiteConfig();
  const v = (config as any)?.maxSubmissionVersions ?? 5;
  return Math.max(1, Math.min(20, v));
}

// 安全删除上传目录下的文件，避免路径穿越
async function safeUnlinkUpload(relPath: string | null | undefined) {
  if (!relPath) return;
  try {
    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const abs = path.normalize(path.join(process.cwd(), 'public', relPath));
    if (!abs.startsWith(uploadsRoot)) return;
    await unlink(abs);
  } catch {}
}

function safeExt(name: string) {
  const ext = path.extname(name || '').toLowerCase();
  return /^[a-z0-9.]{1,12}$/.test(ext) ? ext : '';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');
    const includeVersions = searchParams.get('versions') === '1';
    const userIdFilter = searchParams.get('userId') || undefined;

    const where: any = {};
    if (session.user.role === 'admin') {
      if (userIdFilter) where.userId = userIdFilter;
    } else if (session.user.role === 'judge') {
      // 评委可以看到所有提交（用于评分）
    } else {
      where.userId = session.user.id;
    }
    if (competitionId) {
      where.competitionId = competitionId;
    }
    // 默认仅展示最新版本；admin 显式 versions=1 才返回历史版本
    if (!(includeVersions && session.user.role === 'admin')) {
      where.isLatest = true;
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, school: true } },
        competition: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: session.user.role === 'admin' ? 500 : 200,
    });

    return NextResponse.json(submissions);
  } catch (error) {
    return NextResponse.json({ error: '获取提交列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const MAX_FILE_SIZE = await getMaxFileSize();
    const maxMB = MAX_FILE_SIZE / (1024 * 1024);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const competitionId = formData.get('competitionId') as string;
    let teamName = formData.get('teamName') as string;
    let teamMembers = formData.get('teamMembers') as string;
    const notes = formData.get('notes') as string;
    const teamId = (formData.get('teamId') as string) || null;
    const extraFilesList = formData.getAll('extraFiles') as File[];

    // 团队赛：校验 teamId 必须是当前用户所在的团队，且属于该赛题
    if (teamId) {
      const membership = await (prisma as any).teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
        include: { team: true },
      });
      if (!membership || membership.team.competitionId !== competitionId) {
        return NextResponse.json({ error: '无效的团队，或你不是该团队成员' }, { status: 400 });
      }
      // 自动填充 teamName / teamMembers 文案，方便公示展示
      if (!teamName) teamName = membership.team.name;
      if (!teamMembers) {
        const members = await (prisma as any).teamMember.findMany({
          where: { teamId },
          include: { user: { select: { name: true } } },
        });
        teamMembers = JSON.stringify(members.map((m: any) => m.user.name));
      }
    }

    if (!file || !competitionId) {
      return NextResponse.json({ error: '请上传文件并选择赛题' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `文件大小不能超过${maxMB}MB` }, { status: 400 });
    }

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      return NextResponse.json({ error: '赛题不存在' }, { status: 404 });
    }

    if (competition.status !== 'active') {
      return NextResponse.json({ error: '该赛题未开放提交' }, { status: 400 });
    }

    const now = new Date();
    if (now < competition.startTime) {
      return NextResponse.json({ error: '赛题尚未开始，请到开始时间后再提交' }, { status: 400 });
    }

    if (now > competition.endTime) {
      return NextResponse.json({ error: '提交已截止' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const ext = safeExt(file.name);
    const fileName = `${session.user.id}_${competitionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    const mainView = new Uint8Array(bytes);
    const mainTypeError = validateUpload(file.name, mainView);
    if (mainTypeError) {
      return NextResponse.json({ error: mainTypeError }, { status: 400 });
    }
    await writeFile(filePath, Buffer.from(bytes));

    // Handle extra files
    const extraFilesData: { name: string; path: string }[] = [];
    for (let i = 0; i < extraFilesList.length; i++) {
      const ef = extraFilesList[i];
      if (ef && ef.size > 0) {
        if (ef.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `文件 "${ef.name}" 大小不能超过${maxMB}MB` }, { status: 400 });
        }
        const efExt = safeExt(ef.name);
        const efName = `${session.user.id}_${competitionId}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}${efExt}`;
        const efPath = path.join(uploadDir, efName);
        const efBytes = await ef.arrayBuffer();
        const efView = new Uint8Array(efBytes);
        const efTypeError = validateUpload(ef.name, efView);
        if (efTypeError) {
          return NextResponse.json({ error: efTypeError }, { status: 400 });
        }
        await writeFile(efPath, Buffer.from(efBytes));
        extraFilesData.push({ name: ef.name, path: `/uploads/${efName}` });
      }
    }

    // —— 重交：标记旧的 isLatest 为 false，记录 parentId 链 —— //
    // 团队赛：按 (teamId, competitionId) 找；个人赛/旧数据：按 (userId, competitionId)
    const previousLatest = await prisma.submission.findFirst({
      where: teamId
        ? { teamId, competitionId, isLatest: true } as any
        : { userId: session.user.id, competitionId, teamId: null, isLatest: true } as any,
      orderBy: { createdAt: 'desc' },
    });

    const submission = await prisma.$transaction(async (tx) => {
      if (previousLatest) {
        await tx.submission.update({
          where: { id: previousLatest.id },
          data: { isLatest: false },
        });
      }
      return tx.submission.create({
        data: {
          fileName: file.name,
          filePath: `/uploads/${fileName}`,
          extraFiles: extraFilesData.length > 0 ? JSON.stringify(extraFilesData) : null,
          teamName: teamName || null,
          teamMembers: teamMembers || null,
          notes: notes || null,
          userId: session.user.id,
          competitionId,
          teamId: teamId || null,
          parentId: previousLatest?.id ?? null,
          isLatest: true,
        } as any,
      });
    });

    // —— 版本上限淘汰：超过 maxVersions 时删除最旧版本（含文件） —— //
    try {
      const maxV = await getMaxVersions();
      const versions = await prisma.submission.findMany({
        where: { userId: session.user.id, competitionId },
        orderBy: { createdAt: 'asc' },
      });
      const excess = versions.length - maxV;
      if (excess > 0) {
        const toDelete = versions.slice(0, excess);
        for (const v of toDelete) {
          await safeUnlinkUpload(v.filePath);
          if (v.extraFiles) {
            try {
              const arr = JSON.parse(v.extraFiles) as { path: string }[];
              for (const ef of arr) await safeUnlinkUpload(ef.path);
            } catch {}
          }
          await prisma.submission.delete({ where: { id: v.id } }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('版本淘汰清理出错（已忽略）:', e);
    }

    // —— 用户站内通知 —— //
    if (previousLatest) {
      try {
        await (prisma as any).notification.create({
          data: {
            userId: session.user.id,
            type: 'system',
            title: '已重新提交',
            content: `你已重新提交《${competition.title}》，旧版本已归档。`,
            link: `/competitions/${competitionId}`,
          },
        });
      } catch {}
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error('提交错误:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}
