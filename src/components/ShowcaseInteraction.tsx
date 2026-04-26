'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Heart, MessageCircle, Send, EyeOff, Eye, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSiteConfig } from './SiteConfigProvider';
import { isAdminRole } from '@/lib/roles';

interface Comment {
  id: string;
  content: string;
  hidden: boolean;
  createdAt: string;
  userId: string;
  user: { id: string; name: string };
}

export default function ShowcaseInteraction({ submissionId }: { submissionId: string }) {
  const { data: session } = useSession();
  const { config } = useSiteConfig();
  const isAdmin = isAdminRole(session?.user?.role);
  const interactionEnabled = (config as any).commentsEnabled !== false;

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`/api/showcase/${submissionId}/like`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setLikeCount(d.count); setLiked(d.liked); } })
      .catch(() => {});
  }, [submissionId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/showcase/${submissionId}/comments`);
      if (res.ok) setComments(await res.json());
    } finally { setLoading(false); }
  };

  const toggleOpen = () => {
    if (!open && comments.length === 0) loadComments();
    setOpen(!open);
  };

  const toggleLike = async () => {
    if (!interactionEnabled) return;
    if (!session) { window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`; return; }
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const res = await fetch(`/api/showcase/${submissionId}/like`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        setLikeCount(d.count);
        setLiked(d.liked);
      }
    } finally { setLikeBusy(false); }
  };

  const post = async () => {
    if (!interactionEnabled) return;
    if (!session) { window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`; return; }
    const content = draft.trim();
    if (!content) return;
    setPosting(true); setErr('');
    try {
      const res = await fetch(`/api/showcase/${submissionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setDraft('');
        setComments([d, ...comments]);
      } else setErr(d.error || '评论失败');
    } catch { setErr('评论失败'); }
    setPosting(false);
  };

  const onDelete = async (id: string) => {
    if (!confirm('删除这条评论？')) return;
    const res = await fetch(`/api/showcase/${submissionId}/comments/${id}`, { method: 'DELETE' });
    if (res.ok) setComments(comments.filter((c) => c.id !== id));
  };

  const onToggleHide = async (c: Comment) => {
    const res = await fetch(`/api/showcase/${submissionId}/comments/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: !c.hidden }),
    });
    if (res.ok) setComments(comments.map((x) => x.id === c.id ? { ...x, hidden: !c.hidden } : x));
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLike}
          disabled={likeBusy || !interactionEnabled}
          title={!interactionEnabled ? '互动功能已关闭' : ''}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            liked
              ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
          {likeCount}
        </button>
        <button
          onClick={toggleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          评论 {comments.length > 0 && `(${comments.filter((c) => !c.hidden || isAdmin).length})`}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {!interactionEnabled ? (
            <p className="text-xs text-gray-400 px-3 py-2 bg-gray-50 rounded-xl">评论功能已关闭</p>
          ) : session ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !posting) post(); }}
                maxLength={500}
                placeholder="留下你的评论…"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400"
                disabled={posting}
              />
              <button
                onClick={post}
                disabled={posting || !draft.trim()}
                className="px-3 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition inline-flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> 发送
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">登录后可评论</p>
          )}
          {err && <p className="text-xs text-red-500">{err}</p>}

          {loading ? (
            <p className="text-xs text-gray-400 text-center py-4">加载中…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">还没有评论</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className={`group rounded-lg px-3 py-2 text-sm ${c.hidden ? 'bg-red-50/50 opacity-70' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{c.user?.name || '匿名'}</span>
                      <span>·</span>
                      <span>{formatDate(c.createdAt)}</span>
                      {c.hidden && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-600">已隐藏</span>}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                      {isAdmin && (
                        <button onClick={() => onToggleHide(c)} className="p-1 text-gray-400 hover:text-gray-600" title={c.hidden ? '恢复' : '隐藏'}>
                          {c.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {(isAdmin || session?.user?.id === c.userId) && (
                        <button onClick={() => onDelete(c.id)} className="p-1 text-gray-400 hover:text-red-500" title="删除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-800 mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
