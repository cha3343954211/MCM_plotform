import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

async function getMaxFileSize(): Promise<number> {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    return (config?.maxFileSize || 10) * 1024 * 1024;
  } catch { return 10 * 1024 * 1024; }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competition = await prisma.competition.findUnique({
      where: { id: params.id },
      include: {
        submissions: {
          include: { user: { select: { id: true, name: true, email: true, school: true } } },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: '赛题不存在' }, { status: 404 });
    }

    return NextResponse.json(competition);
  } catch (error) {
    return NextResponse.json({ error: '获取赛题失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
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
    const statusVal = formData.get('status') as string;
    const file = formData.get('attachment') as File | null;
    const removeAttachment = formData.get('removeAttachment') === 'true';
    const extraFiles = formData.getAll('extraAttachments') as File[];
    const existingAttachmentsJson = formData.get('existingAttachments') as string | null;

    const data: any = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (content) data.content = content;
    if (startTime) data.startTime = new Date(startTime);
    if (endTime) data.endTime = new Date(endTime);
    if (statusVal) data.status = statusVal;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'competitions');
    await mkdir(uploadDir, { recursive: true });

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `附件大小不能超过${maxMB}MB` }, { status: 400 });
      }
      const existing = await prisma.competition.findUnique({ where: { id: params.id } });
      if (existing?.attachmentPath) {
        try { await unlink(path.join(process.cwd(), 'public', existing.attachmentPath)); } catch {}
      }
      const ext = path.extname(file.name);
      const fileName = `comp_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      data.attachmentName = file.name;
      data.attachmentPath = `/uploads/competitions/${fileName}`;
    } else if (removeAttachment) {
      const existing = await prisma.competition.findUnique({ where: { id: params.id } });
      if (existing?.attachmentPath) {
        try { await unlink(path.join(process.cwd(), 'public', existing.attachmentPath)); } catch {}
      }
      data.attachmentName = null;
      data.attachmentPath = null;
    }

    // Handle extra attachments
    let attachments: { name: string; path: string }[] = [];
    if (existingAttachmentsJson) {
      try { attachments = JSON.parse(existingAttachmentsJson); } catch {}
    }
    for (let i = 0; i < extraFiles.length; i++) {
      const ef = extraFiles[i];
      if (ef && ef.size > 0) {
        if (ef.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `附件 "${ef.name}" 大小不能超过${maxMB}MB` }, { status: 400 });
        }
        const ext = path.extname(ef.name);
        const fileName = `comp_${Date.now()}_${i}${ext}`;
        const filePath = path.join(uploadDir, fileName);
        const bytes = await ef.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));
        attachments.push({ name: ef.name, path: `/uploads/competitions/${fileName}` });
      }
    }
    data.attachments = attachments.length > 0 ? JSON.stringify(attachments) : null;

    const competition = await prisma.competition.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(competition);
  } catch (error) {
    console.error('更新赛题错误:', error);
    return NextResponse.json({ error: '更新赛题失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 删除关联附件
    const competition = await prisma.competition.findUnique({ where: { id: params.id } });
    if (competition?.attachmentPath) {
      try { await unlink(path.join(process.cwd(), 'public', competition.attachmentPath)); } catch {}
    }

    await prisma.submission.deleteMany({ where: { competitionId: params.id } });
    await prisma.competition.delete({ where: { id: params.id } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: '删除赛题失败' }, { status: 500 });
  }
}
