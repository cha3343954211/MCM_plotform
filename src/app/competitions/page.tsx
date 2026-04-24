'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Clock } from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/competitions')
      .then((res) => res.json())
      .then((data) => { setCompetitions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">赛题列表</h1>

      {competitions.length === 0 ? (
        <div className="text-center py-20 text-gray-500">暂无赛题</div>
      ) : (
        <div className="grid gap-6">
          {competitions.map((comp) => (
            <Link
              key={comp.id}
              href={`/competitions/${comp.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition">
                      {comp.title}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comp.status)}`}>
                      {getStatusLabel(comp.status)}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3">{comp.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(comp.startTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      截止: {formatDate(comp.endTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {comp._count?.submissions || 0} 份提交
                    </span>
                  </div>
                </div>
                <div className="text-primary-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  查看详情 &rarr;
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
