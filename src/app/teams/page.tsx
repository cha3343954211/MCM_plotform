'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus, Copy, LogOut, Trash2, Crown, ChevronRight, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [comps, setComps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', competitionId: '', maxMembers: 5 });
  const [joinCode, setJoinCode] = useState('');
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
        setCreateForm({ name: '', competitionId: '', maxMembers: 5 });
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
          <div>
            <label className="block text-xs text-gray-500 mb-1">人数上限</label>
            <input type="number" min={1} max={20}
              value={createForm.maxMembers}
              onChange={(e) => setCreateForm({ ...createForm, maxMembers: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) })}
              className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
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

                <div className="flex flex-wrap gap-1 mt-3">
                  {team.members?.map((mb: any) => (
                    <span key={mb.userId} className={`px-2 py-0.5 text-[11px] rounded-lg ring-1 ${
                      mb.role === 'leader' ? 'bg-amber-50 text-amber-700 ring-amber-200/50' : 'bg-gray-50 text-gray-600 ring-gray-200/50'
                    }`}>
                      {mb.user?.name}{mb.role === 'leader' ? ' · 队长' : ''}
                    </span>
                  ))}
                </div>

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
