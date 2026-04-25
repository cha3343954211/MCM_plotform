'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Clock, ArrowRight, BookOpen, Search, X } from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import { useSiteConfig } from '@/components/SiteConfigProvider';

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended' | 'draft'>('all');
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div className="mb-8 sm:mb-10 animate-fade-in-up">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor}18, ${config.primaryColor}08)` }}>
            <BookOpen className="w-5 h-5" style={{ color: config.primaryColor }} />
          </div>
          赛题列表
        </h1>
        <p className="text-gray-400 mt-2 text-sm">浏览所有竞赛题目，选择感兴趣的赛题参与</p>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="glass-card rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索赛题标题或描述..."
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-white/60 border border-gray-200/80 rounded-xl outline-none focus:border-gray-400 focus:bg-white transition-all" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 p-1 bg-black/[0.03] rounded-xl">
          {[
            { k: 'all' as const, label: '全部' },
            { k: 'active' as const, label: '进行中' },
            { k: 'ended' as const, label: '已结束' },
          ].map((f) => (
            <button key={f.k} onClick={() => setStatusFilter(f.k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                statusFilter === f.k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {(() => {
        const filtered = competitions.filter((c) => {
          if (statusFilter !== 'all' && c.status !== statusFilter) return false;
          if (!query.trim()) return true;
          const q = query.trim().toLowerCase();
          return (c.title || '').toLowerCase().includes(q)
            || (c.description || '').toLowerCase().includes(q);
        });
        if (competitions.length === 0) {
          return (
            <div className="text-center py-24 glass-card rounded-3xl">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">暂无赛题</p>
            </div>
          );
        }
        if (filtered.length === 0) {
          return (
            <div className="text-center py-16 glass-card rounded-3xl">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">没有匹配的赛题</p>
            </div>
          );
        }
        return (
        <div className="grid gap-4 stagger-children">
          {filtered.map((comp) => (
            <Link key={comp.id} href={`/competitions/${comp.id}`}
              className="block glass-card rounded-2xl p-5 sm:p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-500 group">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-300 tracking-tight">
                      {comp.title}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(comp.status)}`}>
                      {getStatusLabel(comp.status)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{comp.description}</p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(comp.startTime)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />截止: {formatDate(comp.endTime)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{comp._count?.submissions || 0} 份提交</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium transition-all duration-300 group-hover:translate-x-1 self-start sm:self-auto" style={{ color: config.primaryColor }}>
                  详情 <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
        );
      })()}
    </div>
  );
}
