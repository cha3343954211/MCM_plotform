'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AnnouncementList() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/announcements')
      .then((res) => res.json())
      .then((data) => { setAnnouncements(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (announcements.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">公告通知</h2>
          <p className="text-gray-400 text-sm">最新平台动态和竞赛信息</p>
        </div>
      </div>
      <div className="space-y-3 stagger-children">
        {announcements.map((ann) => (
          <div key={ann.id}
            className={`glass-card rounded-2xl p-6 transition-all duration-500 hover:shadow-xl hover:-translate-y-0.5 ${
              ann.pinned ? 'ring-1 ring-amber-200/50' : ''
            }`}>
            <div className="flex items-center gap-2 mb-2">
              {ann.pinned && <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
              <h3 className="font-semibold text-gray-900 tracking-tight">{ann.title}</h3>
              {ann.pinned && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-100/80 text-amber-600">置顶</span>
              )}
            </div>
            <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
            <p className="text-xs text-gray-300 mt-3">{formatDate(ann.createdAt)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
