'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Trash2, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = async () => {
    try {
      const res = await fetch(`/api/notifications?limit=100${filter === 'unread' ? '&unread=1' : ''}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/notifications');
      return;
    }
    if (status === 'authenticated') load();
  }, [status, filter]);

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'POST' });
    load();
  };

  const markOneRead = async (id: string, read: boolean) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read }),
    });
    load();
  };

  const deleteOne = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    load();
  };

  const clearRead = async () => {
    if (!confirm('确定要删除所有已读通知吗？')) return;
    await fetch('/api/notifications', { method: 'DELETE' });
    load();
  };

  if (loading || status === 'loading') {
    return <div className="max-w-3xl mx-auto px-4 py-32 text-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" />
    </div>;
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-gray-500" />通知中心
          </h1>
          <p className="text-gray-400 text-sm mt-1">查看评分、公告等系统消息</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-black/[0.03] rounded-xl">
            {[
              { k: 'all' as const, label: '全部' },
              { k: 'unread' as const, label: '未读' },
            ].map((f) => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  filter === f.k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>{f.label}</button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition">
              <CheckCheck className="w-3 h-3" />全部已读
            </button>
          )}
          <button onClick={clearRead}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition">
            <Trash2 className="w-3 h-3" />清理已读
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-3xl">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id}
              className={`glass-card rounded-2xl p-4 transition-all ${!n.read ? 'ring-1 ring-blue-200/60 bg-blue-50/20' : ''}`}>
              <div className="flex items-start gap-3">
                {!n.read && <span className="mt-2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  {n.link ? (
                    <Link href={n.link} onClick={() => markOneRead(n.id, true)} className="block">
                      <div className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">{n.title}</div>
                      {n.content && <div className="text-sm text-gray-500 mt-1">{n.content}</div>}
                      <div className="text-xs text-gray-400 mt-2">{formatDate(n.createdAt)}</div>
                    </Link>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-900">{n.title}</div>
                      {n.content && <div className="text-sm text-gray-500 mt-1">{n.content}</div>}
                      <div className="text-xs text-gray-400 mt-2">{formatDate(n.createdAt)}</div>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  {!n.read && (
                    <button onClick={() => markOneRead(n.id, true)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="标为已读">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteOne(n.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
