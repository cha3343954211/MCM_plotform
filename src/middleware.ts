import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000; // 1 min
const MAX_ENTRIES = 10_000;

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL && rateLimitMap.size < MAX_ENTRIES) return;
  lastCleanup = now;
  Array.from(rateLimitMap.entries()).forEach(([key, entry]) => {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  });
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  cleanupStaleEntries();
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 管理员路径不限流：/api/admin/* 只有 admin/super_admin 可访问，
  // 而且管理后台初始化会并发拉取 N+4 个 API（提交、AI 评审等），常规限流容易误伤。
  if (pathname.startsWith('/api/admin/')) {
    return NextResponse.next();
  }

  // Rate limit auth endpoints more strictly
  if (pathname === '/api/register' || pathname === '/api/auth/callback/credentials') {
    const key = `auth:${getRateLimitKey(request)}`;
    if (isRateLimited(key, 10, 60_000)) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }
  }

  // General API rate limit（公共接口：登录用户每秒可触发多次刷新）
  if (pathname.startsWith('/api/') && pathname !== '/api/health') {
    const key = `api:${getRateLimitKey(request)}`;
    if (isRateLimited(key, 300, 60_000)) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
