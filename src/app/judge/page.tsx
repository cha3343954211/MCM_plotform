'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Award, Download, Save, ChevronDown, ChevronUp, Search, FileText, Paperclip } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function JudgePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unscored' | 'scored'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [scoreCache, setScoreCache] = useState<Record<string, { score: string; feedback: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/judge');
      return;
    }
    if (status !== 'authenticated') return;
    if (session?.user?.role !== 'judge' && session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }
    fetch('/api/submissions', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : [])
      .then(async (data) => {
        const subs = Array.isArray(data) ? data : [];
        setSubmissions(subs);
        // 预加载我已经打过的分
        const cache: Record<string, { score: string; feedback: string }> = {};
        await Promise.all(subs.map(async (s: any) => {
          try {
            const res = await fetch(`/api/judge-scores?submissionId=${s.id}`);
            if (res.ok) {
              const d = await res.json();
              if (d.scores && d.scores.length > 0) {
                const mine = d.scores[0]; // judge 视角只能看到自己的
                cache[s.id] = { score: String(mine.score), feedback: mine.feedback || '' };
              }
            }
          } catch {}
        }));
        setScoreCache(cache);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, session, router]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = submissions.filter((s: any) => {
      const hasMyScore = !!scoreCache[s.id];
      if (filter === 'unscored' && hasMyScore) return false;
      if (filter === 'scored' && !hasMyScore) return false;
      if (!q) return true;
      return (s.user?.name || '').toLowerCase().includes(q)
        || (s.competition?.title || '').toLowerCase().includes(q)
        || (s.teamName || '').toLowerCase().includes(q);
    });
    const m = new Map<string, { competition: any; subs: any[] }>();
    for (const s of filtered) {
      const key = s.competitionId;
      if (!m.has(key)) m.set(key, { competition: s.competition, subs: [] });
      m.get(key)!.subs.push(s);
    }
    return Array.from(m.entries());
  }, [submissions, search, filter, scoreCache]);

  const submitScore = async (subId: string) => {
    const v = scoreCache[subId];
    if (!v) return;
    const score = Number(v.score);
    if (!isFinite(score) || score < 0 || score > 100) {
      setMsg('分数必须在 0-100 之间');
      return;
    }
    setBusy(subId);
    try {
      const res = await fetch('/api/judge-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: subId, score, feedback: v.feedback || null }),
      });
      if (res.ok) setMsg('已提交评分');
      else { const d = await res.json().catch(() => ({})); setMsg(d.error || '评分失败'); }
    } finally { setBusy(null); }
  };

  if (status === 'loading' || loading) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-500">加载中…</div>;
  }

  const isAdmin = session?.user?.role === 'admin';
  const totalUnscored = submissions.filter((s) => !scoreCache[s.id]).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">评委工作台</h1>
            <p className="text-gray-400 text-sm">独立打分，最终成绩取所有评委的平均</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索作者/赛题/团队"
              className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition w-56" />
          </div>
          <div className="flex flex-wrap gap-1 p-1 bg-black/[0.03] rounded-xl">
            {([
              { k: 'all', label: `全部 (${submissions.length})` },
              { k: 'unscored', label: `待我评 (${totalUnscored})` },
              { k: 'scored', label: `已评 (${submissions.length - totalUnscored})` },
            ] as const).map((f) => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  filter === f.k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-xl text-sm ${msg.includes('成功') || msg.includes('已提交') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg}
          <button onClick={() => setMsg('')} className="ml-2 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {grouped.length === 0 ? (
        <p className="text-center py-16 bg-white rounded-2xl border border-gray-200/80 text-gray-400">暂无提交</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(([compId, { competition, subs }]) => {
            const isExp = expanded.has(compId);
            return (
              <div key={compId} className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden">
                <button onClick={() => {
                  const next = new Set(expanded);
                  if (isExp) next.delete(compId); else next.add(compId);
                  setExpanded(next);
                }}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{competition?.title || '未知赛题'}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">共 {subs.length} 份</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <a href={`/api/competitions/${compId}/export`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 text-[11px] bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                        ZIP
                      </a>
                    )}
                    {isExp ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {isExp && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100 bg-gray-50/30">
                    {subs.map((sub: any) => {
                      const cached = scoreCache[sub.id];
                      const hasMine = !!cached;
                      return (
                        <div key={sub.id} className={`bg-white rounded-xl border p-4 ${hasMine ? 'border-emerald-200' : 'border-gray-200'}`}>
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-500">提交者: {sub.user?.name} {sub.user?.school && `· ${sub.user.school}`}</p>
                              {sub.teamName && <p className="text-sm text-gray-500">团队: {sub.teamName}</p>}
                              <p className="text-sm text-gray-500">文件: {sub.fileName}</p>
                              {sub.extraFiles && (() => {
                                try {
                                  const arr = JSON.parse(sub.extraFiles);
                                  return Array.isArray(arr) && arr.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {arr.map((ef: any, i: number) => (
                                        <a key={i} href={`/api/download?path=${encodeURIComponent(ef.path)}&name=${encodeURIComponent(ef.name)}`}
                                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                          <Paperclip className="w-3 h-3" />{ef.name}
                                        </a>
                                      ))}
                                    </div>
                                  );
                                } catch { return null; }
                              })()}
                              <p className="text-xs text-gray-400 mt-1">提交时间: {formatDate(sub.createdAt)}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <a href={`/api/download?path=${encodeURIComponent(sub.filePath)}&name=${encodeURIComponent(sub.fileName)}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                                <Download className="w-3 h-3" /> 下载
                              </a>
                            </div>
                          </div>
                          <div className="mt-3 grid md:grid-cols-[120px_1fr_auto] gap-2 items-start">
                            <input
                              type="number" min={0} max={100} step={0.5}
                              value={cached?.score ?? ''}
                              onChange={(e) => setScoreCache({ ...scoreCache, [sub.id]: { score: e.target.value, feedback: cached?.feedback || '' } })}
                              placeholder="0-100"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <input
                              type="text" maxLength={500}
                              value={cached?.feedback ?? ''}
                              onChange={(e) => setScoreCache({ ...scoreCache, [sub.id]: { score: cached?.score || '', feedback: e.target.value } })}
                              placeholder="评语（可选）"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <button
                              disabled={busy === sub.id}
                              onClick={() => submitScore(sub.id)}
                              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 transition inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Save className="w-3.5 h-3.5" /> {hasMine ? '更新评分' : '提交评分'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
