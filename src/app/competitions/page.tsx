'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import { useSiteConfig } from '@/components/SiteConfigProvider';

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { config } = useSiteConfig();

  useEffect(() => {
    fetch('/api/competitions')
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => { setCompetitions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setCompetitions([]); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-32 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor}18, ${config.primaryColor}08)` }}>
            <BookOpen className="w-5 h-5" style={{ color: config.primaryColor }} />
          </div>
          赛题列表
        </h1>
        <p className="text-gray-400 mt-2 text-sm">浏览所有竞赛题目，选择感兴趣的赛题参与</p>
      </div>

      {competitions.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-3xl">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">暂无赛题</p>
        </div>
      ) : (
        <div className="grid gap-4 stagger-children">
          {competitions.map((comp) => (
            <Link key={comp.id} href={`/competitions/${comp.id}`}
              className="block glass-card rounded-2xl p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-500 group">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-300 tracking-tight">
                      {comp.title}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(comp.status)}`}>
                      {getStatusLabel(comp.status)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{comp.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(comp.startTime)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />截止: {formatDate(comp.endTime)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{comp._count?.submissions || 0} 份提交</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium transition-all duration-300 group-hover:translate-x-1" style={{ color: config.primaryColor }}>
                  详情 <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
