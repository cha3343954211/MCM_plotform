import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { applyAiReview } from '@/lib/aiReview';

export const dynamic = 'force-dynamic';

// POST /api/admin/ai-reviews/[id]/apply —— 将该条 AI 评审的分数采纳为提交成绩
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole((session.user as any).role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  try {
    const r = await applyAiReview(params.id, (session.user as any).id);
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '采纳失败' }, { status: 400 });
  }
}
