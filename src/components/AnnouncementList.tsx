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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">公告通知</h2>
      </div>
      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className={`bg-white rounded-xl border p-5 transition hover:shadow-sm ${
              ann.pinned ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {ann.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
              <h3 className="font-semibold text-gray-900">{ann.title}</h3>
              {ann.pinned && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">置顶</span>
              )}
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
            <p className="text-xs text-gray-400 mt-3">{formatDate(ann.createdAt)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
