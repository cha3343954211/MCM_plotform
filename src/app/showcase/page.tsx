'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Award, Medal, Star, ExternalLink } from 'lucide-react';
import { formatDate, getAwardLabel, getAwardColor, isPresetAward } from '@/lib/utils';
import { useSiteConfig } from '@/components/SiteConfigProvider';

const AWARD_ORDER: Record<string, number> = {
  special: 0, first: 1, second: 2, third: 3, excellent: 4,
};

const AWARD_ICON: Record<string, typeof Trophy> = {
  special: Trophy,
  first: Award,
  second: Medal,
  third: Medal,
  excellent: Star,
};

export default function ShowcasePage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { config } = useSiteConfig();

  useEffect(() => {
    fetch('/api/showcase')
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => {
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a: any, b: any) => (AWARD_ORDER[a.award] ?? 99) - (AWARD_ORDER[b.award] ?? 99)
        );
        setSubmissions(sorted);
        setLoading(false);
      })
      .catch(() => { setSubmissions([]); setLoading(false); });
  }, []);

  const filtered = filter === 'all'
    ? submissions
    : submissions.filter((s) => s.award === filter);

  const awardCounts = submissions.reduce((acc: Record<string, number>, s: any) => {
    acc[s.award] = (acc[s.award] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-32 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${config.primaryColor}18, ${config.primaryColor}08)` }}>
            <Trophy className="w-5 h-5" style={{ color: config.primaryColor }} />
          </div>
          论文公示
        </h1>
        <p className="text-gray-400 mt-2 text-sm">优秀参赛作品展示，向所有获奖团队致敬</p>
      </div>

      {/* Stats */}
      {submissions.length > 0 && (() => {
        const presetAwards = ['special', 'first', 'second', 'third', 'excellent'].filter(a => awardCounts[a]);
        const customAwards = Object.keys(awardCounts).filter(a => !isPresetAward(a));
        const allAwardKeys = [...presetAwards, ...customAwards];
        return (
          <>
            <div className={`grid gap-3 mb-10 stagger-children`} style={{ gridTemplateColumns: `repeat(${Math.min(allAwardKeys.length, 5)}, minmax(0, 1fr))` }}>
              {allAwardKeys.map((award) => {
                const Icon = AWARD_ICON[award] || Star;
                const count = awardCounts[award] || 0;
                return (
                  <button key={award} onClick={() => setFilter(filter === award ? 'all' : award)}
                    className={`glass-card rounded-2xl p-4 text-center transition-all duration-500 hover:shadow-lg hover:-translate-y-0.5 ${
                      filter === award ? 'ring-2 shadow-lg' : ''
                    }`} style={filter === award ? { borderColor: config.primaryColor } : {}}>
                    <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: config.primaryColor }} />
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{getAwardLabel(award)}</div>
                  </button>
                );
              })}
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white/60 text-gray-500 hover:bg-white'
                }`}>
                全部 ({submissions.length})
              </button>
              {allAwardKeys.map((award) => (
                <button key={award} onClick={() => setFilter(filter === award ? 'all' : award)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    filter === award ? 'bg-gray-900 text-white' : 'bg-white/60 text-gray-500 hover:bg-white'
                  }`}>
                  {getAwardLabel(award)} ({awardCounts[award]})
                </button>
              ))}
            </div>
          </>
        );
      })()}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-3xl">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">暂无公示记录</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {filtered.map((sub: any) => {
            const Icon = AWARD_ICON[sub.award] || Star;
            return (
              <div key={sub.id} className="glass-card rounded-2xl p-6 transition-all duration-500 hover:shadow-xl hover:-translate-y-0.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold ring-1 ${getAwardColor(sub.award)}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {getAwardLabel(sub.award)}
                      </span>
                      <Link href={`/competitions/${sub.competition?.id}`}
                        className="text-sm text-gray-400 hover:text-primary-500 transition-colors flex items-center gap-1">
                        {sub.competition?.title} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-semibold text-gray-900">{sub.user?.name || '匿名'}</span>
                      {sub.user?.school && <span className="text-gray-400">{sub.user.school}</span>}
                      {sub.teamName && <span className="text-gray-400">团队: {sub.teamName}</span>}
                    </div>
                    {sub.score !== null && sub.score !== undefined && (
                      <div className="mt-2 text-sm text-gray-400">
                        成绩: <span className="font-semibold text-gray-600">{sub.score} 分</span>
                        {sub.feedback && <span className="ml-2">| {sub.feedback}</span>}
                      </div>
                    )}
                    <p className="text-xs text-gray-300 mt-2">{formatDate(sub.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
