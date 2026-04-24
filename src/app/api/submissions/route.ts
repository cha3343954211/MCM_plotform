import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function getMaxFileSize(): Promise<number> {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    return (config?.maxFileSize || 10) * 1024 * 1024;
  } catch { return 10 * 1024 * 1024; }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');

    const where: any = {};
    if (session.user.role !== 'admin') {
      where.userId = session.user.id;
    }
    if (competitionId) {
      where.competitionId = competitionId;
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, school: true } },
        competition: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
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
    const teamName = formData.get('teamName') as string;
    const teamMembers = formData.get('teamMembers') as string;
    const notes = formData.get('notes') as string;
    const extraFilesList = formData.getAll('extraFiles') as File[];

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

    const ext = path.extname(file.name);
    const fileName = `${session.user.id}_${competitionId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Handle extra files
    const extraFilesData: { name: string; path: string }[] = [];
    for (let i = 0; i < extraFilesList.length; i++) {
      const ef = extraFilesList[i];
      if (ef && ef.size > 0) {
        if (ef.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `文件 "${ef.name}" 大小不能超过${maxMB}MB` }, { status: 400 });
        }
        const efExt = path.extname(ef.name);
        const efName = `${session.user.id}_${competitionId}_${Date.now()}_${i}${efExt}`;
        const efPath = path.join(uploadDir, efName);
        const efBytes = await ef.arrayBuffer();
        await writeFile(efPath, Buffer.from(efBytes));
        extraFilesData.push({ name: ef.name, path: `/uploads/${efName}` });
      }
    }

    const submission = await prisma.submission.create({
      data: {
        fileName: file.name,
        filePath: `/uploads/${fileName}`,
        extraFiles: extraFilesData.length > 0 ? JSON.stringify(extraFilesData) : null,
        teamName: teamName || null,
        teamMembers: teamMembers || null,
        notes: notes || null,
        userId: session.user.id,
        competitionId,
      },
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error('提交错误:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}
