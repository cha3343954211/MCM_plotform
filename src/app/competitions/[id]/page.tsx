'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Upload, FileText, ArrowLeft, Paperclip, Plus, X } from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import { useSiteConfig } from '@/components/SiteConfigProvider';

export default function CompetitionDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const { config } = useSiteConfig();
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ teamName: '', teamMembers: '', notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/competitions/${id}`)
      .then((res) => res.json())
      .then((data) => { setCompetition(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setMessage('请选择文件'); return; }
    setSubmitting(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('competitionId', id as string);
    formData.append('teamName', form.teamName);
    formData.append('teamMembers', form.teamMembers);
    formData.append('notes', form.notes);
    for (const ef of extraFiles) {
      formData.append('extraFiles', ef);
    }

    try {
      const res = await fetch('/api/submissions', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || '提交失败');
      } else {
        setMessage('提交成功！');
        setShowForm(false);
        setFile(null);
        setExtraFiles([]);
        setForm({ teamName: '', teamMembers: '', notes: '' });
        // Refresh competition data
        const refreshRes = await fetch(`/api/competitions/${id}`);
        const refreshData = await refreshRes.json();
        setCompetition(refreshData);
      }
    } catch {
      setMessage('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">加载中...</div>;
  if (!competition) return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">赛题不存在</div>;

  const canSubmit = competition.status === 'active' && new Date() <= new Date(competition.endTime);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/competitions" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回赛题列表
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{competition.title}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(competition.status)}`}>
            {getStatusLabel(competition.status)}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />开始: {formatDate(competition.startTime)}</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />截止: {formatDate(competition.endTime)}</span>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700 mb-6 whitespace-pre-wrap">
          {competition.content}
        </div>

        {(competition.attachmentName || competition.attachments) && (
          <div className="mb-6 space-y-2">
            {competition.attachmentName && (
              <a
                href={`/api/download?path=${encodeURIComponent(competition.attachmentPath)}&name=${encodeURIComponent(competition.attachmentName)}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
              >
                <Paperclip className="w-4 h-4" />
                附件下载: {competition.attachmentName}
              </a>
            )}
            {competition.attachments && (() => {
              try {
                const extras = JSON.parse(competition.attachments);
                if (Array.isArray(extras) && extras.length > 0) {
                  return (
                    <div className="flex flex-wrap gap-2">
                      {extras.map((att: any, idx: number) => (
                        <a key={idx}
                          href={`/api/download?path=${encodeURIComponent(att.path)}&name=${encodeURIComponent(att.name)}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                        >
                          <Paperclip className="w-4 h-4" />
                          {att.name}
                        </a>
                      ))}
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}
          </div>
        )}

        {session && canSubmit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition"
          >
            <Upload className="w-4 h-4" />
            {showForm ? '取消提交' : '提交论文'}
          </button>
        )}

        {!session && canSubmit && (
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition">
            登录后提交
          </Link>
        )}
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes('成功') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
          <h2 className="text-lg font-semibold mb-6">提交论文</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">团队名称</label>
              <input
                type="text"
                value={form.teamName}
                onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="输入团队名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">团队成员</label>
              <input
                type="text"
                value={form.teamMembers}
                onChange={(e) => setForm({ ...form, teamMembers: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="成员姓名，用逗号分隔"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                rows={3}
                placeholder="其他说明"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">上传论文文件（主文件）</label>
              <input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  const maxBytes = config.maxFileSize * 1024 * 1024;
                  if (f && f.size > maxBytes) {
                    setMessage(`文件大小不能超过${config.maxFileSize}MB`);
                    e.target.value = '';
                    return;
                  }
                  setFile(f);
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium hover:file:bg-primary-100"
                accept=".pdf,.doc,.docx,.zip,.rar"
                required
              />
              <p className="mt-1 text-xs text-gray-400">支持 PDF、Word、ZIP、RAR 格式，最大{config.maxFileSize}MB</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Plus className="w-4 h-4 inline mr-1" />
                附加文件（可选，可多选）
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  const maxBytes = config.maxFileSize * 1024 * 1024;
                  const oversized = selected.find(f => f.size > maxBytes);
                  if (oversized) {
                    setMessage(`文件 "${oversized.name}" 大小超过${config.maxFileSize}MB`);
                    e.target.value = '';
                    return;
                  }
                  setExtraFiles(selected);
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium hover:file:bg-primary-100"
                accept=".pdf,.doc,.docx,.zip,.rar,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg"
              />
              {extraFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {extraFiles.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      <Paperclip className="w-3 h-3" /> {f.name}
                      <button type="button" onClick={() => setExtraFiles(extraFiles.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {submitting ? '提交中...' : '确认提交'}
            </button>
          </form>
        </div>
      )}

      {session && competition.submissions && competition.submissions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {session.user.role === 'admin' ? '所有提交' : '我的提交'}
          </h2>
          <div className="space-y-4">
            {competition.submissions
              .filter((s: any) => session.user.role === 'admin' || s.userId === session.user.id)
              .map((sub: any) => (
                <div key={sub.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{sub.fileName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                      {getStatusLabel(sub.status)}
                    </span>
                  </div>
                  {sub.teamName && <p className="text-sm text-gray-500">团队: {sub.teamName}</p>}
                  {session.user.role === 'admin' && <p className="text-sm text-gray-500">提交者: {sub.user?.name} ({sub.user?.email})</p>}
                  <p className="text-xs text-gray-400 mt-1">提交时间: {formatDate(sub.createdAt)}</p>
                  {sub.score !== null && sub.score !== undefined && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700">成绩: {sub.score} 分</p>
                      {sub.feedback && <p className="text-sm text-blue-600 mt-1">评语: {sub.feedback}</p>}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
