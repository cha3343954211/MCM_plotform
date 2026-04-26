import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';
import { tryAcquireExportLock, releaseExportLock } from '@/lib/exportLock';
import path from 'path';
import { createReadStream, statSync } from 'fs';
import archiver from 'archiver';

export const dynamic = 'force-dynamic';
// Node 运行时（archiver 依赖 stream，edge 不支持）
export const runtime = 'nodejs';

function safeFileNamePart(s: string, fallback = 'unnamed'): string {
  // 仅保留中英文/数字/常用标点，限长 60
  const cleaned = (s || fallback).replace(/[\\/:*?"<>|\r\n\t]/g, '_').trim();
  return cleaned.slice(0, 60) || fallback;
}

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  // 授权：admin / super_admin 或 judge
  if (!session || (!isAdminRole(session.user.role) && session.user.role !== 'judge')) {
    return new Response(JSON.stringify({ error: '无权限' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 全局并发锁：仅允许 1 个打包任务
  if (!tryAcquireExportLock()) {
    return new Response(JSON.stringify({ error: '已有打包任务正在执行，请稍后再试' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '30' },
    });
  }

  try {
    const competition = await prisma.competition.findUnique({ where: { id: params.id } });
    if (!competition) {
      releaseExportLock();
      return new Response(JSON.stringify({ error: '赛题不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const submissions = await prisma.submission.findMany({
      where: { competitionId: params.id, isLatest: true } as any,
      include: {
        user: { select: { name: true, email: true, school: true, studentId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const archive = archiver('zip', { zlib: { level: 6 } });

    // 包装成 ReadableStream 以便 NextResponse 流式返回
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        archive.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        archive.on('end', () => {
          controller.close();
          releaseExportLock();
        });
        archive.on('error', (err: any) => {
          console.error('zip error:', err);
          controller.error(err);
          releaseExportLock();
        });

        // ===== 添加 CSV 元数据 =====
        const header = ['序号', '提交人', '邮箱', '学校', '学号', '队名', '队员', '主文件', '附加文件', '得分', '奖项', '提交时间'].map(csvEscape).join(',');
        const rows = submissions.map((s, i) => {
          const extras = s.extraFiles
            ? (() => { try { return (JSON.parse(s.extraFiles!) as { name: string }[]).map((e) => e.name).join('; '); } catch { return ''; } })()
            : '';
          return [
            i + 1,
            s.user.name,
            s.user.email,
            s.user.school || '',
            s.user.studentId || '',
            s.teamName || '',
            (() => { try { return s.teamMembers ? JSON.parse(s.teamMembers).join('; ') : ''; } catch { return s.teamMembers || ''; } })(),
            s.fileName,
            extras,
            s.score ?? '',
            s.award || '',
            new Date(s.createdAt).toISOString(),
          ].map(csvEscape).join(',');
        });
        // BOM 让 Excel 直接识别 UTF-8
        const csvContent = '\uFEFF' + [header, ...rows].join('\r\n');
        archive.append(csvContent, { name: '提交清单.csv' });

        // ===== 添加每个用户的提交文件 =====
        submissions.forEach((s, i) => {
          const idx = String(i + 1).padStart(3, '0');
          const folder = `${idx}_${safeFileNamePart(s.user.name)}_${safeFileNamePart(s.user.school || '')}`;

          // 主文件
          const mainAbs = path.normalize(path.join(process.cwd(), 'public', s.filePath));
          const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
          if (mainAbs.startsWith(uploadsRoot)) {
            try {
              statSync(mainAbs); // exists?
              archive.append(createReadStream(mainAbs), { name: `${folder}/${safeFileNamePart(s.fileName)}` });
            } catch {}
          }

          // 附加文件
          if (s.extraFiles) {
            try {
              const arr = JSON.parse(s.extraFiles) as { name: string; path: string }[];
              for (const ef of arr) {
                const efAbs = path.normalize(path.join(process.cwd(), 'public', ef.path));
                if (!efAbs.startsWith(uploadsRoot)) continue;
                try {
                  statSync(efAbs);
                  archive.append(createReadStream(efAbs), { name: `${folder}/extras/${safeFileNamePart(ef.name)}` });
                } catch {}
              }
            } catch {}
          }
        });

        archive.finalize().catch((e) => {
          console.error('archive finalize error:', e);
          releaseExportLock();
        });
      },
      cancel() {
        try { archive.abort(); } catch {}
        releaseExportLock();
      },
    });

    const fileName = `${safeFileNamePart(competition.title)}_${new Date().toISOString().slice(0, 10)}.zip`;
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    releaseExportLock();
    console.error('导出失败:', e);
    return new Response(JSON.stringify({ error: '导出失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
