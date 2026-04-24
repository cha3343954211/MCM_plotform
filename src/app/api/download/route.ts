import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
    }

    // 安全检查: 防止路径遍历攻击
    const normalized = path.normalize(filePath).replace(/\\/g, '/');
    if (normalized.includes('..') || !normalized.startsWith('/uploads/')) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    const absolutePath = path.join(process.cwd(), 'public', normalized);

    // 检查文件是否存在
    try {
      await stat(absolutePath);
    } catch {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const fileBuffer = await readFile(absolutePath);
    const fileName = path.basename(absolutePath);
    const ext = path.extname(fileName).toLowerCase();

    // MIME 类型映射
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';

    // 从 query 获取原始文件名
    const originalName = searchParams.get('name') || fileName;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('文件下载错误:', error);
    return NextResponse.json({ error: '下载失败' }, { status: 500 });
  }
}
