'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FileText, ExternalLink, ArrowRight, Trash2, Award, Download } from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor, getAwardLabel, getAwardColor } from '@/lib/utils';
import { useSiteConfig } from '@/components/SiteConfigProvider';

export default function MySubmissionsPage() {
  const { data: session, status } = useSession();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { config } = useSiteConfig();

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该提交？已上传的文件将一并删除，且无法恢复。')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(data.error || '删除失败');
      }
    } catch {
      alert('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/submissions')
        .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
        .then((data) => { setSubmissions(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => { setSubmissions([]); setLoading(false); });
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center">
        <div className="glass-card rounded-3xl p-12 max-w-sm mx-auto">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 mb-6">请先登录查看提交记录</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-2xl apple-btn"
            style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}>
            去登录 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-32 text-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor}18, ${config.primaryColor}08)` }}>
            <FileText className="w-5 h-5" style={{ color: config.primaryColor }} />
          </div>
          我的提交
        </h1>
        <p className="text-gray-400 mt-2 text-sm">查看你的所有参赛提交和评审结果</p>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-3xl">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">暂无提交记录</p>
          <Link href="/competitions" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: config.primaryColor }}>
            去查看赛题 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {submissions.map((sub) => (
            <div key={sub.id} className="glass-card rounded-2xl p-6 transition-all duration-500 hover:shadow-xl hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Link href={`/competitions/${sub.competitionId}`}
                    className="text-base font-semibold text-gray-900 hover:text-primary-600 transition-colors duration-300 flex items-center gap-1.5 tracking-tight">
                    {sub.competition?.title} <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
                  </Link>
                  <p className="text-sm text-gray-400 mt-0.5">文件: {sub.fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold ${getStatusColor(sub.status)}`}>
                    {getStatusLabel(sub.status)}
                  </span>
                  {sub.status !== 'graded' && (
                    <button
                      onClick={() => handleDelete(sub.id)}
                      disabled={deletingId === sub.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 disabled:opacity-40"
                      title="删除提交">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {sub.teamName && <p className="text-sm text-gray-400">团队: {sub.teamName}</p>}
              {sub.award && (
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ring-1 ${getAwardColor(sub.award)}`}>
                    <Award className="w-3.5 h-3.5" /> {getAwardLabel(sub.award)}
                  </span>
                  <Link
                    href={`/certificate/${sub.id}`}
                    target="_blank"
                    className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    <Download className="w-3.5 h-3.5" /> 下载证书
                  </Link>
                </div>
              )}
              <p className="text-xs text-gray-300 mt-1">提交时间: {formatDate(sub.createdAt)}</p>

              {sub.score !== null && sub.score !== undefined && (
                <div className="mt-3 p-4 rounded-2xl" style={{ background: `${config.primaryColor}08` }}>
                  <p className="text-sm font-semibold" style={{ color: config.primaryColor }}>成绩: {sub.score} 分</p>
                  {sub.feedback && <p className="text-sm mt-1" style={{ color: `${config.primaryColor}bb` }}>评语: {sub.feedback}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
