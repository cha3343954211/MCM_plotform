import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';

function getHandler(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const origin = `${proto}://${host}`;

  const dynamicOptions = {
    ...authOptions,
    cookies: {
      ...authOptions.cookies,
    },
  };

  // Override NEXTAUTH_URL based on request origin
  process.env.NEXTAUTH_URL = origin;

  return NextAuth(dynamicOptions);
}

export async function GET(req: NextRequest, ctx: any) {
  return getHandler(req)(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
  return getHandler(req)(req, ctx);
}
