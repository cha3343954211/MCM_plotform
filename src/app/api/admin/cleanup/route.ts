import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

type UploadFile = { rel: string; full: string; size: number };

async function listUploadFiles(dir = UPLOAD_DIR, prefix = ''): Promise<UploadFile[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const result: UploadFile[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      result.push(...await listUploadFiles(full, rel));
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      const st = await stat(full);
      result.push({ rel: `uploads/${rel}`.replace(/\\/g, '/'), full, size: st.size });
    } catch {}
  }
  return result;
}

async function collectReferencedPaths(): Promise<Set<string>> {
  const refs = new Set<string>();
  const [subs, comps] = await Promise.all([
    prisma.submission.findMany({ select: { filePath: true, extraFiles: true } }),
    prisma.competition.findMany({ select: { attachmentPath: true, attachments: true } }),
  ]);

  const addRel = (p?: string | null) => {
    if (!p) return;
    // 规范化到 uploads/xxx 形式
    const norm = p.replace(/^\/+/, '').replace(/\\/g, '/');
    refs.add(norm);
    // 也加基础文件名，便于比对
    refs.add(path.basename(norm));
  };

  for (const s of subs) {
    addRel(s.filePath);
    if (s.extraFiles) {
      try {
        const arr = JSON.parse(s.extraFiles);
        if (Array.isArray(arr)) arr.forEach((f: any) => addRel(f?.path));
      } catch {}
    }
  }
  for (const c of comps) {
    addRel(c.attachmentPath);
    if (c.attachments) {
      try {
        const arr = JSON.parse(c.attachments);
        if (Array.isArray(arr)) arr.forEach((f: any) => addRel(f?.path));
      } catch {}
    }
  }
  return refs;
}

// GET - 预览清理项
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 3600 * 1000;

    // 孤立文件扫描
    let orphanFiles: { name: string; size: number }[] = [];
    let totalOrphanSize = 0;
    try {
      const refs = await collectReferencedPaths();
      const files = await listUploadFiles();
      for (const file of files) {
        if (refs.has(file.rel) || refs.has(path.basename(file.rel))) continue;
        try {
          orphanFiles.push({ name: file.rel, size: file.size });
          totalOrphanSize += file.size;
        } catch {}
      }
    } catch {}

    // 旧登录日志 (> 30 天)
    const oldLoginLogs = await (prisma as any).loginLog.count({
      where: { createdAt: { lt: new Date(now - THIRTY_DAYS) } },
    });

    // 已读通知 (> 30 天)
    const oldReadNotifications = await (prisma as any).notification.count({
      where: { read: true, createdAt: { lt: new Date(now - THIRTY_DAYS) } },
    });

    // 所有已读通知
    const allReadNotifications = await (prisma as any).notification.count({
      where: { read: true },
    });

    // 所有登录日志
    const allLoginLogs = await (prisma as any).loginLog.count();

    return NextResponse.json({
      orphanFiles: {
        count: orphanFiles.length,
        totalSize: totalOrphanSize,
        files: orphanFiles.slice(0, 50), // 预览前 50 个
      },
      loginLogs: {
        all: allLoginLogs,
        old: oldLoginLogs,
      },
      notifications: {
        allRead: allReadNotifications,
        oldRead: oldReadNotifications,
      },
    });
  } catch (e: any) {
    console.error('清理预览失败:', e);
    return NextResponse.json({ error: e?.message || '查询失败' }, { status: 500 });
  }
}

// POST - 执行清理
// body: { target: 'orphan_files' | 'old_login_logs' | 'all_login_logs' | 'old_read_notifications' | 'all_read_notifications' }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { target } = await request.json();
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 3600 * 1000;

    if (target === 'orphan_files') {
      const refs = await collectReferencedPaths();
      const files = await listUploadFiles();
      let deleted = 0;
      let freedBytes = 0;
      for (const file of files) {
        if (refs.has(file.rel) || refs.has(path.basename(file.rel))) continue;
        try {
          await unlink(file.full);
          deleted++;
          freedBytes += file.size;
        } catch {}
      }
      return NextResponse.json({ ok: true, deleted, freedBytes });
    }

    if (target === 'old_login_logs') {
      const res = await (prisma as any).loginLog.deleteMany({
        where: { createdAt: { lt: new Date(now - THIRTY_DAYS) } },
      });
      return NextResponse.json({ ok: true, deleted: res.count });
    }

    if (target === 'all_login_logs') {
      const res = await (prisma as any).loginLog.deleteMany({});
      return NextResponse.json({ ok: true, deleted: res.count });
    }

    if (target === 'old_read_notifications') {
      const res = await (prisma as any).notification.deleteMany({
        where: { read: true, createdAt: { lt: new Date(now - THIRTY_DAYS) } },
      });
      return NextResponse.json({ ok: true, deleted: res.count });
    }

    if (target === 'all_read_notifications') {
      const res = await (prisma as any).notification.deleteMany({ where: { read: true } });
      return NextResponse.json({ ok: true, deleted: res.count });
    }

    return NextResponse.json({ error: '未知的清理目标' }, { status: 400 });
  } catch (e: any) {
    console.error('清理执行失败:', e);
    return NextResponse.json({ error: e?.message || '清理失败' }, { status: 500 });
  }
}
