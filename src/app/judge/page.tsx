'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Award, Save, Search, Filter, CheckCircle2, FileText, ChevronUp, ChevronDown, Paperclip, Download, Sparkles, Loader2, X, History } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { canReview, isSuperAdminRole } from '@/lib/roles';

// 安全 JSON：响应可能空 / 非 JSON，全部兜底为对象
async function safeJson(res: Response): Promise<{ ok: boolean; status: number; data: any; raw: string }> {
  const text = await res.text();
  let data: any = {};
  if (text) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
      try { data = JSON.parse(text); } catch { data = { error: '非 JSON 响应', _raw: text.slice(0, 200) }; }
    } else {
      data = { error: `服务返回非 JSON（HTTP ${res.status}）`, _raw: text.slice(0, 200) };
    }
  } else {
    data = { error: `空响应（HTTP ${res.status}）` };
  }
  return { ok: res.ok, status: res.status, data, raw: text };
}

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

  // AI 评审状态
  const [aiLatest, setAiLatest] = useState<Record<string, { reviewId: string; score: number | null; status: string; applied: boolean; createdAt: string }>>({});
  const [aiRunning, setAiRunning] = useState<Set<string>>(new Set());
  const [aiPanelOpen, setAiPanelOpen] = useState<Set<string>>(new Set()); // 每个 submission 的 AI 评审面板展开
  const [aiHistory, setAiHistory] = useState<Record<string, any[]>>({});
  const [aiHistoryLoading, setAiHistoryLoading] = useState<Set<string>>(new Set());
  const [aiHistoryLoaded, setAiHistoryLoaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/judge');
      return;
    }
    if (status !== 'authenticated') return;
    if (!canReview(session?.user?.role)) {
      router.push('/');
      return;
    }
    fetch('/api/submissions?anonymous=1', { cache: 'no-store' })
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
        // 预加载每条提交的最新一条 AI 评审
        await loadAiLatest(subs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, session, router]);

  // 批量拉取每个提交的最新一条 AI 评审
  const loadAiLatest = useCallback(async (subs: any[]) => {
    if (!Array.isArray(subs) || subs.length === 0) { setAiLatest({}); return; }
    try {
      const ids = subs.map((s) => s.id).filter(Boolean);
      const r = await fetch(`/api/judge/ai-reviews/latest?submissionIds=${encodeURIComponent(ids.join(','))}`, { cache: 'no-store' });
      const j = await safeJson(r);
      const latest: Record<string, any> = j.data?.latest || {};
      const next: Record<string, any> = {};
      for (const s of subs) {
        const row = latest[s.id];
        if (row) next[s.id] = { reviewId: row.id, score: row.parsedScore, status: row.status, applied: row.applied, createdAt: row.createdAt };
      }
      setAiLatest(next);
    } catch (e) {
      console.warn('loadAiLatest failed:', e);
    }
  }, []);

  // 加载某个提交的全部 AI 评审历史
  const loadAiHistory = useCallback(async (submissionId: string) => {
    setAiHistoryLoading((s) => new Set(s).add(submissionId));
    try {
      const r = await fetch(`/api/judge/ai-reviews?submissionId=${encodeURIComponent(submissionId)}&limit=20`, { cache: 'no-store' });
      const j = await safeJson(r);
      setAiHistory((m) => ({ ...m, [submissionId]: j.data?.reviews || [] }));
      setAiHistoryLoaded((s) => new Set(s).add(submissionId));
    } catch (e) {
      console.warn('loadAiHistory failed:', e);
    } finally {
      setAiHistoryLoading((s) => { const n = new Set(s); n.delete(submissionId); return n; });
    }
  }, []);

  // 触发 AI 评审
  const runAiReviewFor = useCallback(async (sub: any) => {
    if (!sub?.id) return;
    if (!/\.(pdf|docx)$/i.test(sub.fileName || '')) {
      setMsg('AI 评审仅支持 PDF / DOCX 文件');
      return;
    }
    if (aiRunning.has(sub.id)) return;
    setAiRunning((s) => new Set(s).add(sub.id));
    setMsg(`正在对「${sub.fileName}」运行 AI 评审，请稍候…`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const res = await fetch('/api/judge/ai-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sub.id }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const j = await safeJson(res);
      if (res.ok && j.data?.status === 'success') {
        setMsg(`AI 评审完成：分数 ${j.data?.result?.score ?? '-'}（仅供参考）`);
      } else if (res.ok && j.data?.status === 'failed') {
        setMsg(`AI 评审失败：${j.data?.error || '未知错误'}`);
      } else {
        setMsg(j.data?.error || `AI 评审失败（HTTP ${j.status}）`);
      }
      // 刷新 latest + 当前打开的历史
      await loadAiLatest(submissions);
      if (aiPanelOpen.has(sub.id)) {
        await loadAiHistory(sub.id);
        setAiHistoryLoaded((s) => { const n = new Set(s); n.delete(sub.id); return n; }); // 强制重拉
        await loadAiHistory(sub.id);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || /aborted|abort/i.test(String(e?.message || ''))) {
        setMsg('AI 评审等待超过 3 分钟已自动取消。请在「管理后台 → AI 评审配置」调大 timeoutMs 后重试。');
      } else {
        setMsg(e?.message || 'AI 评审失败');
      }
    } finally {
      clearTimeout(timeout);
      setAiRunning((s) => { const n = new Set(s); n.delete(sub.id); return n; });
    }
  }, [aiRunning, aiPanelOpen, submissions, loadAiLatest, loadAiHistory]);

  // 切换 AI 评审面板
  const toggleAiPanel = useCallback(async (submissionId: string) => {
    const willOpen = !aiPanelOpen.has(submissionId);
    setAiPanelOpen((s) => {
      const n = new Set(s);
      if (willOpen) n.add(submissionId); else n.delete(submissionId);
      return n;
    });
    if (willOpen) await loadAiHistory(submissionId);
  }, [aiPanelOpen, loadAiHistory]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = submissions.filter((s: any) => {
      const hasMyScore = !!scoreCache[s.id];
      if (filter === 'unscored' && hasMyScore) return false;
      if (filter === 'scored' && !hasMyScore) return false;
      if (!q) return true;
      return (s.anonymousCode || '').toLowerCase().includes(q)
        || (s.user?.name || '').toLowerCase().includes(q)
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

  const isAdmin = isSuperAdminRole(session?.user?.role);
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
                      const ai = aiLatest[sub.id];
                      const isAiOpen = aiPanelOpen.has(sub.id);
                      const isAiRunning = aiRunning.has(sub.id);
                      const fileIsAiSupported = /\.(pdf|docx)$/i.test(sub.fileName || '');
                      return (
                        <div key={sub.id} className={`bg-white rounded-xl border p-4 ${hasMine ? 'border-emerald-200' : 'border-gray-200'}`}>
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm text-gray-700 font-medium">提交者: {sub.user?.name} {sub.user?.school && `· ${sub.user.school}`}</p>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{sub.anonymousCode}</span>
                                {ai?.score != null && (
                                  <span className="text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />AI {Number(ai.score).toFixed(1)}
                                  </span>
                                )}
                              </div>
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
                            <div className="flex items-start gap-2 flex-wrap">
                              <a href={`/api/download?path=${encodeURIComponent(sub.filePath)}&name=${encodeURIComponent(sub.fileName)}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                                <Download className="w-3 h-3" /> 下载
                              </a>
                              <button
                                type="button"
                                disabled={isAiRunning || !fileIsAiSupported}
                                onClick={() => runAiReviewFor(sub)}
                                title={!fileIsAiSupported ? 'AI 评审仅支持 PDF / DOCX' : '对该提交运行 AI 评审（与后台共享）'}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 disabled:opacity-50 transition border border-violet-200/50"
                              >
                                {isAiRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {isAiRunning ? 'AI 评审中…' : 'AI 评审'}
                              </button>
                              {ai && (
                                <button
                                  type="button"
                                  onClick={() => toggleAiPanel(sub.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-white text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 transition"
                                >
                                  <History className="w-3 h-3" />{isAiOpen ? '收起' : '历史'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* AI 评审历史面板（折叠） */}
                          {ai && isAiOpen && (
                            <div className="mt-3 rounded-xl border border-violet-200/50 bg-violet-50/30 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-violet-700 inline-flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" /> AI 评审历史
                                </p>
                                <button onClick={() => toggleAiPanel(sub.id)} className="text-gray-400 hover:text-gray-600">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {aiHistoryLoading.has(sub.id) ? (
                                <p className="text-xs text-gray-500 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />加载中…</p>
                              ) : (aiHistory[sub.id] && aiHistory[sub.id].length > 0) ? (
                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                  {aiHistory[sub.id].map((r: any) => (
                                    <div key={r.id} className="bg-white rounded-lg p-2.5 border border-gray-200/60">
                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="inline-flex items-center gap-1">
                                          {r.status === 'success' ? (
                                            <span className="text-emerald-600">● 成功 · 分数 <b className="text-gray-900">{r.parsedScore ?? '-'}</b></span>
                                          ) : r.status === 'pending' ? (
                                            <span className="text-amber-600">● 进行中</span>
                                          ) : (
                                            <span className="text-rose-600">● 失败</span>
                                          )}
                                        </span>
                                        <span>{formatDate(r.createdAt)}</span>
                                      </div>
                                      {r.parsedSummary && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-3"><b>总结：</b>{r.parsedSummary}</p>
                                      )}
                                      {r.parsedFeedback && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-4"><b>反馈：</b>{r.parsedFeedback}</p>
                                      )}
                                      {r.errorMessage && (
                                        <p className="text-xs text-rose-600 mt-1 line-clamp-3"><b>错误：</b>{r.errorMessage}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">暂无历史</p>
                              )}
                              <p className="text-[11px] text-gray-400 italic">提示：AI 评审结果仅供参考，最终成绩仍以评委人工评分为准。</p>
                            </div>
                          )}

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
