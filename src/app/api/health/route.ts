import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  const checks: Record<string, string> = {};
  const metrics: Record<string, any> = {};

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Filesystem check
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.access(uploadDir);
    checks.filesystem = 'ok';
  } catch {
    checks.filesystem = 'error';
  }

  // 内存指标（不参与健康判定，仅暴露）
  try {
    const m = process.memoryUsage();
    metrics.memoryMB = {
      rss: Math.round(m.rss / 1048576),
      heapUsed: Math.round(m.heapUsed / 1048576),
      heapTotal: Math.round(m.heapTotal / 1048576),
    };
    metrics.uptimeSec = Math.round(process.uptime());
  } catch {}

  // 磁盘剩余空间（统计 uploads 所在分区的空闲块数 × 块大小）
  try {
    const fs = await import('fs');
    const path = await import('path');
    const stat: any = await new Promise((resolve, reject) => {
      const fn = (fs as any).statfs;
      if (typeof fn !== 'function') return resolve(null);
      fn(path.join(process.cwd()), (err: any, s: any) => err ? reject(err) : resolve(s));
    });
    if (stat) {
      const freeBytes = Number(stat.bavail) * Number(stat.bsize);
      const totalBytes = Number(stat.blocks) * Number(stat.bsize);
      const freeMB = Math.round(freeBytes / 1048576);
      metrics.diskFreeMB = freeMB;
      metrics.diskTotalMB = Math.round(totalBytes / 1048576);
      // 少于 500MB 视为告警
      checks.diskSpace = freeMB > 500 ? 'ok' : 'warn';
    } else {
      checks.diskSpace = 'unknown';
    }
  } catch {
    checks.diskSpace = 'unknown';
  }

  const failed = Object.values(checks).some((v) => v === 'error');
  const duration = Date.now() - start;

  return NextResponse.json(
    {
      status: failed ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      checks,
      metrics,
    },
    { status: failed ? 503 : 200 }
  );
}
