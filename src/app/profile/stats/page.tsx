'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, FileText, BarChart3, Star, Medal, Award, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const AWARD_LABEL: Record<string, { text: string; cls: string }> = {
  special:   { text: '特等奖', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  first:     { text: '一等奖', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  second:    { text: '二等奖', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
  third:     { text: '三等奖', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  excellent: { text: '优秀奖', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
};

export default function ProfileStatsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile/stats');
      return;
    }
    if (status !== 'authenticated') return;
    fetch('/api/profile/stats')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, router]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-500">加载中…</div>;
  }
  if (!data) {
    return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-500">无法加载成绩数据</div>;
  }

  const { total, gradedCount, averageScore, bestScore, awards, trend, recent } = data;

  // 简易 SVG 折线图（不引图表库）
  const trendW = 600, trendH = 120, padX = 30, padY = 16;
  const maxScore = Math.max(100, ...trend.map((t: any) => t.score || 0));
  const points: Array<{ x: number; y: number; score: number; title: string; date: string }> = trend.map((t: any, i: number) => {
    const x = trend.length === 1 ? trendW / 2 : padX + ((trendW - 2 * padX) * i) / (trend.length - 1);
    const y = trendH - padY - ((t.score || 0) / maxScore) * (trendH - 2 * padY);
    return { x, y, score: t.score, title: t.title, date: t.date };
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的成绩</h1>
          <p className="text-sm text-gray-500 mt-1">查看你的参赛历程、得分曲线与获奖记录</p>
        </div>
        <Link href="/profile" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
          返回个人资料 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 概览卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<FileText className="w-5 h-5 text-blue-500" />} label="参赛次数" value={total} />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-emerald-500" />} label="已评分" value={gradedCount} />
        <StatCard icon={<Star className="w-5 h-5 text-amber-500" />} label="平均分" value={averageScore !== null ? averageScore : '—'} />
        <StatCard icon={<Trophy className="w-5 h-5 text-rose-500" />} label="最高分" value={bestScore !== null ? bestScore : '—'} />
      </div>

      {/* 成绩曲线 */}
      {trend.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" /> 成绩走势
          </h2>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${trendW} ${trendH}`} className="w-full" style={{ minWidth: 300 }}>
              {/* 网格线 */}
              {[0, 25, 50, 75, 100].map((v) => {
                const y = trendH - padY - (v / maxScore) * (trendH - 2 * padY);
                return (
                  <g key={v}>
                    <line x1={padX} y1={y} x2={trendW - padX} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
                    <text x={4} y={y + 3} fontSize="10" fill="#9ca3af">{v}</text>
                  </g>
                );
              })}
              {/* 折线 */}
              {points.length > 1 && (
                <polyline
                  fill="none" stroke="#2563eb" strokeWidth="2"
                  points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                />
              )}
              {/* 点 */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#2563eb" />
                  <title>{`${p.title}\n${p.date} · ${p.score} 分`}</title>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* 获奖墙 */}
      {awards.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-500" /> 获奖记录（{awards.length}）
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {awards.map((a: any) => {
              const al = AWARD_LABEL[a.award] || { text: a.award, cls: 'bg-gray-50 text-gray-700 ring-gray-200' };
              return (
                <Link href={`/competitions/${a.competitionId}`} key={a.submissionId}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition group">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{a.competitionTitle}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatDate(a.createdAt)}{typeof a.score === 'number' ? ` · ${a.score} 分` : ''}</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ring-1 flex-shrink-0 ${al.cls}`}>
                    <Award className="w-3 h-3 inline mr-1" />{al.text}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 近期提交 */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-500" /> 近期提交
        </h2>
        {recent.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">还没有提交记录</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map((r: any) => (
              <Link href={`/competitions/${r.competitionId}`} key={r.id}
                className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50/60 -mx-2 px-2 rounded-lg transition">
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 truncate">{r.competitionTitle}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatDate(r.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.status === 'graded' ? (
                    <span className="text-sm font-semibold text-emerald-600">{r.score} 分</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200/50">待评</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 日历订阅 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-blue-600" /> 日历订阅
        </h2>
        <p className="text-sm text-gray-600 mb-3">订阅后所有进行中的赛题截止时间会自动出现在你的系统日历里</p>
        <SubscribeButton />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-4">
      <div className="flex items-center gap-2 text-gray-500 text-sm">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function SubscribeButton() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchUrl = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/calendar/token', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        const full = `${window.location.origin}/api/calendar/${d.token}.ics`;
        setUrl(full);
      }
    } finally { setBusy(false); }
  };

  if (!url) {
    return (
      <button onClick={fetchUrl} disabled={busy}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition">
        {busy ? '生成中…' : '生成订阅链接'}
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <code className="block text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 break-all">{url}</code>
      <div className="flex gap-2">
        <button
          onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
        >{copied ? '已复制' : '复制链接'}</button>
        <a href={url} className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">下载 .ics</a>
      </div>
      <p className="text-xs text-gray-500">把这个链接添加到 Apple 日历 / Google Calendar / Outlook 即可订阅</p>
    </div>
  );
}
