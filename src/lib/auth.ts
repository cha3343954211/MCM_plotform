import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials, req) {
        const email = credentials?.email || '';
        const ip = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()
          || (req?.headers?.['x-real-ip'] as string)
          || null;
        const userAgent = (req?.headers?.['user-agent'] as string) || null;

        const logAttempt = async (userId: string | null, success: boolean, reason?: string) => {
          try {
            await (prisma as any).loginLog.create({
              data: { userId, email, success, ip, userAgent, reason: reason || null },
            });
          } catch {}
        };

        if (!credentials?.email || !credentials?.password) {
          await logAttempt(null, false, '缺少邮箱或密码');
          throw new Error('请输入邮箱和密码');
        }

        // 登录失败锁定检查: 15 分钟内失败 >= 5 次则锁定 15 分钟
        const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
        const LOCKOUT_THRESHOLD = 5;
        try {
          const recentFails = await (prisma as any).loginLog.count({
            where: {
              email,
              success: false,
              createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
            },
          });
          if (recentFails >= LOCKOUT_THRESHOLD) {
            await logAttempt(null, false, '账号锁定中');
            throw new Error('登录失败次数过多，请 15 分钟后再试');
          }
        } catch (e: any) {
          if (e?.message?.includes('登录失败次数过多')) throw e;
          // db error, ignore lockout check
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          await logAttempt(null, false, '用户不存在');
          throw new Error('用户不存在');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          await logAttempt(user.id, false, '密码错误');
          throw new Error('密码错误');
        }

        await logAttempt(user.id, true);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || (() => { if (process.env.NODE_ENV === 'production') throw new Error('NEXTAUTH_SECRET is required in production'); return 'dev-secret-do-not-use-in-production'; })(),
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};
