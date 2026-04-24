import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  const checks: Record<string, string> = {};

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

  const healthy = Object.values(checks).every((v) => v === 'ok');
  const duration = Date.now() - start;

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
