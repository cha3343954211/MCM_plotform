'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck } from 'lucide-react';
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

export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch('/api/notifications?limit=10', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => {
        const next = data.items || [];
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
      setUnreadCount((prev) => prev === (data.unreadCount || 0) ? prev : (data.unreadCount || 0));
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // 每 60 秒轮询一次 (2C2G 友好)
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'POST' });
    load();
  };

  const markOneRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    load();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 rounded-xl hover:bg-black/[0.04] transition-all"
        title="通知">
        <Bell className="w-4 h-4 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[480px] overflow-hidden glass-card rounded-2xl shadow-xl border border-gray-200/70 flex flex-col z-50 animate-fade-in-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">通知</span>
              {unreadCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 rounded-md">{unreadCount} 未读</span>}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-[11px] text-gray-500 hover:text-gray-900 flex items-center gap-1">
                <CheckCheck className="w-3 h-3" />全部已读
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">暂无通知</div>
            ) : (
              items.map((n) => (
                <div key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      {n.link ? (
                        <Link href={n.link} onClick={() => { markOneRead(n.id); setOpen(false); }}
                          className="block">
                          <div className="text-sm font-medium text-gray-900 truncate">{n.title}</div>
                          {n.content && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.content}</div>}
                          <div className="text-[10px] text-gray-400 mt-1">{formatDate(n.createdAt)}</div>
                        </Link>
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate">{n.title}</div>
                          {n.content && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.content}</div>}
                          <div className="text-[10px] text-gray-400 mt-1">{formatDate(n.createdAt)}</div>
                        </div>
                      )}
                    </div>
                    {!n.read && (
                      <button onClick={() => markOneRead(n.id)}
                        className="p-1 text-gray-300 hover:text-gray-700" title="标记已读">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/notifications" onClick={() => setOpen(false)}
            className="block text-center py-2.5 text-xs text-gray-500 hover:text-gray-900 border-t border-gray-100">
            查看全部通知
          </Link>
        </div>
      )}
    </div>
  );
}
