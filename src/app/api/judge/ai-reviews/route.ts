// 评委工作台 AI 评审 API
// - 触发评审：POST /api/judge/ai-reviews  body: { submissionId }
// - 列出评审：GET  /api/judge/ai-reviews?submissionId=&limit=
// - 批量最新：GET  /api/judge/ai-reviews/latest?submissionIds=a,b,c
// 权限：judge / admin / super_admin 均可访问；写操作时 triggeredBy 记录当前评委
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { canReview } from '@/lib/roles';
import { runAiReview } from '@/lib/aiReview';

export const dynamic = 'force-dynamic';

async function ensureJudge() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canReview((session.user as any)?.role)) {
      return { error: NextResponse.json({ error: '无权限' }, { status: 403 }) };
    }
    return { session };
  } catch (e: any) {
    return { error: NextResponse.json({ error: `鉴权失败：${e?.message || '未知错误'}` }, { status: 500 }) };
  }
}

// GET /api/judge/ai-reviews?submissionId=&limit=
export async function GET(request: NextRequest) {
  try {
    const auth = await ensureJudge();
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const where: any = {};
    if (submissionId) where.submissionId = submissionId;
    if (status) where.status = status;

    let reviews: any[] = [];
    try {
      reviews = await (prisma as any).aiReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (e: any) {
      return NextResponse.json({ error: `数据库读取失败：${e?.message || '未知错误'}` }, { status: 500 });
    }

    // 关联展示：触发者（评委或管理员）
    const userIds: string[] = Array.from(new Set<string>(reviews.map((r: any) => r.triggeredBy).filter(Boolean)));
    let userMap = new Map<string, any>();
    if (userIds.length) {
      try {
        const us = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, role: true } });
        userMap = new Map(us.map((u: any) => [u.id, u]));
      } catch {}
    }

    const enriched = reviews.map((r: any) => ({
      ...r,
      triggeredByUser: userMap.get(r.triggeredBy) || null,
    }));

    return NextResponse.json({ reviews: enriched, total: enriched.length });
  } catch (e: any) {
    return NextResponse.json({ error: `GET 失败：${e?.message || '未知错误'}` }, { status: 500 });
  }
}

// POST /api/judge/ai-reviews —— body: { submissionId }
// 触发一次 AI 评审；同步返回结果（可能耗时数十秒）
export async function POST(request: NextRequest) {
  try {
    const auth = await ensureJudge();
    if ('error' in auth) return auth.error;

    let body: any;
    try { body = await request.json(); } catch { return NextResponse.json({ error: '请求格式错误' }, { status: 400 }); }
    const submissionId = String(body?.submissionId || '').trim();
    if (!submissionId) return NextResponse.json({ error: '需要 submissionId' }, { status: 400 });

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) return NextResponse.json({ error: '提交不存在' }, { status: 404 });

    // 文件类型检查
    if (!/\.(pdf|docx)$/i.test(submission.fileName || '')) {
      return NextResponse.json({ error: 'AI 评审仅支持 PDF / DOCX 文件' }, { status: 400 });
    }

    try {
      const { reviewId, status, result, error } = await runAiReview(submissionId, {
        adminId: (auth.session!.user as any).id,
        adminName: (auth.session!.user as any).name,
      });
      return NextResponse.json({ reviewId, status, result, error });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'AI 评审失败' }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: `POST 失败：${e?.message || '未知错误'}` }, { status: 500 });
  }
}
