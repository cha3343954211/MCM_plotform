'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus, Copy, LogOut, Trash2, Crown, ChevronRight, FileText, Edit3, UserMinus, ArrowRightLeft, Download, Paperclip } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [comps, setComps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', competitionId: '' });
  const [joinCode, setJoinCode] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const reload = async () => {
    const [m, c] = await Promise.all([
      fetch('/api/teams', { cache: 'no-store' }).then((r) => r.ok ? r.json() : []),
      fetch('/api/competitions?status=active', { cache: 'no-store' }).then((r) => r.ok ? r.json() : []).catch(() => []),
    ]);
    setList(Array.isArray(m) ? m : []);
    setComps(Array.isArray(c) ? c : []);
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/teams');
      return;
    }
    if (status !== 'authenticated') return;
    reload();
  }, [status, router]);

  const create = async () => {
    if (!createForm.name.trim() || !createForm.competitionId) {
      setMsg({ type: 'err', text: '请填写团队名并选择赛题' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: 'ok', text: `团队创建成功，邀请码：${d.inviteCode}` });
        setShowCreate(false);
        setCreateForm({ name: '', competitionId: '' });
        reload();
      } else {
        setMsg({ type: 'err', text: d.error || '创建失败' });
      }
    } finally { setBusy(false); }
  };

  const join = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode.trim().toUpperCase() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: 'ok', text: '已加入团队' });
        setShowJoin(false);
        setJoinCode('');
        reload();
      } else {
        setMsg({ type: 'err', text: d.error || '加入失败' });
      }
    } finally { setBusy(false); }
  };

  const leave = async (teamId: string, isLeader: boolean) => {
    const action = isLeader ? 'disband' : 'leave';
    const text = isLeader ? '解散这个团队？所属提交将解除关联（不会删除）' : '退出这个团队？';
    if (!confirm(text)) return;
    const res = await fetch(`/api/teams/${teamId}?action=${action}`, { method: 'DELETE' });
    if (res.ok) { setMsg({ type: 'ok', text: isLeader ? '已解散' : '已退出' }); reload(); }
    else { const d = await res.json().catch(() => ({})); setMsg({ type: 'err', text: d.error || '操作失败' }); }
  };

  const startEditTeam = (team: any) => {
    setEditingTeamId(team.id);
    setEditForm({ name: team.name || '' });
  };

  const saveTeam = async (teamId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: 'ok', text: '团队信息已更新' });
        setEditingTeamId(null);
        reload();
      } else {
        setMsg({ type: 'err', text: d.error || '更新失败' });
      }
    } finally { setBusy(false); }
  };

  const kickMember = async (teamId: string, userId: string, name?: string) => {
    if (!confirm(`确定移除成员 ${name || ''}？`)) return;
    const res = await fetch(`/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'kick', userId }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ type: 'ok', text: '成员已移除' }); reload(); }
    else setMsg({ type: 'err', text: d.error || '移除失败' });
  };

  const transferLeader = async (teamId: string, userId: string, name?: string) => {
    if (!confirm(`确定将队长转让给 ${name || '该成员'}？`)) return;
    const res = await fetch(`/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transfer', userId }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ type: 'ok', text: '队长已转让' }); reload(); }
    else setMsg({ type: 'err', text: d.error || '转让失败' });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (status === 'loading' || loading) {
    return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-500">加载中…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的团队</h1>
            <p className="text-gray-400 text-sm">每个赛题最多隶属一个团队，提交以团队为单位</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowJoin(true); setShowCreate(false); }}
            className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition inline-flex items-center gap-1">
            加入团队
          </button>
          <button onClick={() => { setShowCreate(true); setShowJoin(false); }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition inline-flex items-center gap-1">
            <Plus className="w-4 h-4" /> 创建团队
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-3 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* 加入面板 */}
      {showJoin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h3 className="font-medium mb-3">输入邀请码加入</h3>
          <div className="flex gap-2">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="6 位邀请码" maxLength={8}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm uppercase tracking-widest font-mono" />
            <button onClick={join} disabled={busy}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">加入</button>
            <button onClick={() => { setShowJoin(false); setJoinCode(''); }}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition">取消</button>
          </div>
        </div>
      )}

      {/* 创建面板 */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 space-y-3">
          <h3 className="font-medium">创建新团队</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">团队名</label>
            <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="如：智算先锋" maxLength={50}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">参赛赛题</label>
            <select value={createForm.competitionId} onChange={(e) => setCreateForm({ ...createForm, competitionId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
              <option value="">— 选择赛题 —</option>
              {comps.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          {createForm.competitionId && (
            <p className="text-xs text-gray-500 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl">
              该赛题每队最多 {comps.find((c) => c.id === createForm.competitionId)?.teamMaxMembers || 5} 人，由管理员统一设置。
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">取消</button>
            <button onClick={create} disabled={busy}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">创建</button>
          </div>
        </div>
      )}

      {/* 团队列表 */}
      {list.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/80">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">你还没有加入任何团队</p>
          <p className="text-xs text-gray-300 mt-1">参赛前请先创建或加入一个团队</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((m: any) => {
            const team = m.team;
            const isLeader = m.membershipRole === 'leader';
            return (
              <div key={team.id} className="bg-white rounded-2xl border border-gray-200/80 p-5 hover:border-gray-300 transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{team.name}</h3>
                      {isLeader && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 ring-1 ring-amber-200/50 inline-flex items-center gap-1">
                          <Crown className="w-3 h-3" /> 队长
                        </span>
                      )}
                    </div>
                    <Link href={`/competitions/${team.competition?.id}`}
                      className="text-xs text-blue-600 hover:underline mt-0.5 inline-flex items-center gap-1">
                      {team.competition?.title} <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  成员 {team.members?.length || 0}/{team.maxMembers} ·
                  提交 {team._count?.submissions || 0} 份 ·
                  创建于 {formatDate(team.createdAt)}
                </div>

                {isLeader && editingTeamId === team.id && (
                  <div className="mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-blue-100 rounded-lg outline-none"
                      placeholder="团队名称" maxLength={50} />
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => saveTeam(team.id)} disabled={busy}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg disabled:opacity-50">保存</button>
                      <button onClick={() => setEditingTeamId(null)}
                        className="px-3 py-1.5 text-xs bg-white text-gray-600 rounded-lg border border-gray-200">取消</button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mt-3">
                  {team.members?.map((mb: any) => (
                    <span key={mb.userId} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-lg ring-1 ${
                      mb.role === 'leader' ? 'bg-amber-50 text-amber-700 ring-amber-200/50' : 'bg-gray-50 text-gray-600 ring-gray-200/50'
                    }`}>
                      {mb.user?.name}{mb.role === 'leader' ? ' · 队长' : ''}
                      {isLeader && mb.role !== 'leader' && (
                        <>
                          <button onClick={() => transferLeader(team.id, mb.userId, mb.user?.name)}
                            className="ml-1 text-blue-500 hover:text-blue-700" title="转让队长">
                            <ArrowRightLeft className="w-3 h-3" />
                          </button>
                          <button onClick={() => kickMember(team.id, mb.userId, mb.user?.name)}
                            className="text-red-500 hover:text-red-700" title="移除成员">
                            <UserMinus className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </span>
                  ))}
                </div>

                {team.submissions?.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-xs font-semibold text-gray-600">最近提交</h4>
                      <span className="text-[11px] text-gray-400">共 {team._count?.submissions || team.submissions.length} 份</span>
                    </div>
                    <div className="space-y-2">
                      {team.submissions.map((sub: any) => (
                        <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{sub.fileName}</p>
                            <p className="text-[11px] text-gray-400">
                              {formatDate(sub.createdAt)}
                              {sub.score !== null && sub.score !== undefined ? ` · ${sub.score} 分` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <a
                              href={`/api/download?path=${encodeURIComponent(sub.filePath)}&name=${encodeURIComponent(sub.fileName)}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-white text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200"
                            >
                              <Download className="w-3 h-3" /> 主文件
                            </a>
                            {sub.extraFiles && (() => {
                              try {
                                const extras = JSON.parse(sub.extraFiles);
                                if (!Array.isArray(extras) || extras.length === 0) return null;
                                return extras.map((ef: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={`/api/download?path=${encodeURIComponent(ef.path)}&name=${encodeURIComponent(ef.name)}`}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-white text-blue-600 rounded-lg hover:bg-blue-50 border border-blue-100"
                                  >
                                    <Paperclip className="w-3 h-3" /> 附件{idx + 1}
                                  </a>
                                ));
                              } catch { return null; }
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                  <button onClick={() => copyCode(team.inviteCode)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg font-mono tracking-widest"
                    title="点击复制邀请码">
                    <Copy className="w-3 h-3" />{copiedCode === team.inviteCode ? '已复制' : team.inviteCode}
                  </button>
                  <Link href={`/competitions/${team.competition?.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg">
                    <FileText className="w-3 h-3" /> 提交
                  </Link>
                  {isLeader && (
                    <button onClick={() => startEditTeam(team)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg">
                      <Edit3 className="w-3 h-3" /> 编辑
                    </button>
                  )}
                  <button onClick={() => leave(team.id, isLeader)}
                    className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg">
                    {isLeader ? <Trash2 className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                    {isLeader ? '解散' : '退出'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
