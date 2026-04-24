import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return ip;
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
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

  // Rate limit auth endpoints more strictly
  if (pathname === '/api/register' || pathname === '/api/auth/callback/credentials') {
    const key = `auth:${getRateLimitKey(request)}`;
    if (isRateLimited(key, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }
  }

  // General API rate limit
  if (pathname.startsWith('/api/') && pathname !== '/api/health') {
    const key = `api:${getRateLimitKey(request)}`;
    if (isRateLimited(key, 100, 60 * 1000)) {
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
