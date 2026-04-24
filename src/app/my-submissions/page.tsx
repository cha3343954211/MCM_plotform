'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FileText, ExternalLink } from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';

export default function MySubmissionsPage() {
  const { data: session, status } = useSession();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/submissions')
        .then((res) => res.json())
        .then((data) => { setSubmissions(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">请先登录</p>
        <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">去登录</Link>
      </div>
    );
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
        <FileText className="w-7 h-7" /> 我的提交
      </h1>

      {submissions.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          暂无提交记录，
          <Link href="/competitions" className="text-primary-600 hover:text-primary-700 font-medium ml-1">去查看赛题</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Link
                    href={`/competitions/${sub.competitionId}`}
                    className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition flex items-center gap-1"
                  >
                    {sub.competition?.title} <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <p className="text-sm text-gray-500 mt-0.5">文件: {sub.fileName}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                  {getStatusLabel(sub.status)}
                </span>
              </div>

              {sub.teamName && <p className="text-sm text-gray-500">团队: {sub.teamName}</p>}
              <p className="text-xs text-gray-400 mt-1">提交时间: {formatDate(sub.createdAt)}</p>

              {sub.score !== null && sub.score !== undefined && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-700">成绩: {sub.score} 分</p>
                  {sub.feedback && <p className="text-sm text-blue-600 mt-1">评语: {sub.feedback}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
