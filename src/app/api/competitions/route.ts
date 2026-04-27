import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function getMaxFileSize(): Promise<number> {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    return (config?.maxFileSize || 10) * 1024 * 1024;
  } catch { return 10 * 1024 * 1024; }
}

function safeExt(name: string) {
  const ext = path.extname(name || '').toLowerCase();
  return /^[a-z0-9.]{1,12}$/.test(ext) ? ext : '';
}

export async function GET() {
  try {
    const competitions = await prisma.competition.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
    return NextResponse.json(competitions);
  } catch (error) {
    return NextResponse.json({ error: '获取赛题失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const MAX_FILE_SIZE = await getMaxFileSize();
    const maxMB = MAX_FILE_SIZE / (1024 * 1024);

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const content = formData.get('content') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const status = (formData.get('status') as string) || 'draft';
    const teamMaxMembersRaw = formData.get('teamMaxMembers');
    const teamMaxMembers = Math.max(1, Math.min(20, parseInt(String(teamMaxMembersRaw ?? '5'), 10) || 5));
    const file = formData.get('attachment') as File | null;
    const extraFiles = formData.getAll('extraAttachments') as File[];

    if (!title || !description || !content || !startTime || !endTime) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: '开始或截止时间格式不正确' }, { status: 400 });
    }
    if (endDate.getTime() <= startDate.getTime()) {
      return NextResponse.json({ error: '截止时间必须晚于开始时间' }, { status: 400 });
    }

    let attachmentName: string | null = null;
    let attachmentPath: string | null = null;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'competitions');
    await mkdir(uploadDir, { recursive: true });

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `附件大小不能超过${maxMB}MB` }, { status: 400 });
      }
      const ext = safeExt(file.name);
      const fileName = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      attachmentName = file.name;
      attachmentPath = `/uploads/competitions/${fileName}`;
    }

    // Handle extra attachments
    const attachments: { name: string; path: string }[] = [];
    for (let i = 0; i < extraFiles.length; i++) {
      const ef = extraFiles[i];
      if (ef && ef.size > 0) {
        if (ef.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `附件 "${ef.name}" 大小不能超过${maxMB}MB` }, { status: 400 });
        }
        const ext = safeExt(ef.name);
        const fileName = `comp_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        const filePath = path.join(uploadDir, fileName);
        const bytes = await ef.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));
        attachments.push({ name: ef.name, path: `/uploads/competitions/${fileName}` });
      }
    }

    const competition = await prisma.competition.create({
      data: {
        title,
        description,
        content,
        startTime: startDate,
        endTime: endDate,
        status,
        teamMaxMembers,
        attachmentName,
        attachmentPath,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
      },
    });

    return NextResponse.json(competition);
  } catch (error) {
    console.error('创建赛题错误:', error);
    return NextResponse.json({ error: '创建赛题失败' }, { status: 500 });
  }
}
