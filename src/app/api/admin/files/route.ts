import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  category: string;
  modifiedAt: string;
}

async function scanDir(dirPath: string, category: string, basePath: string): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const fileStat = await stat(fullPath);
      if (fileStat.isFile()) {
        files.push({
          name: entry,
          path: `${basePath}/${entry}`,
          size: fileStat.size,
          category,
          modifiedAt: fileStat.mtime.toISOString(),
        });
      }
    }
  } catch {}
  return files;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const competitionsDir = path.join(uploadsDir, 'competitions');

    const [submissionFiles, competitionFiles] = await Promise.all([
      scanDir(uploadsDir, '论文提交', '/uploads'),
      scanDir(competitionsDir, '赛题附件', '/uploads/competitions'),
    ]);

    // 过滤掉 competitions 子目录中的文件重复（uploads 目录只取非 competitions 子目录的文件）
    const allFiles = [...competitionFiles, ...submissionFiles];

    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);

    return NextResponse.json({
      files: allFiles,
      totalSize,
      totalCount: allFiles.length,
    });
  } catch (error) {
    console.error('获取文件列表错误:', error);
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { filePath } = await request.json();
    if (!filePath || !filePath.startsWith('/uploads/')) {
      return NextResponse.json({ error: '无效的文件路径' }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), 'public', filePath);
    await unlink(fullPath);

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: '删除文件失败' }, { status: 500 });
  }
}
