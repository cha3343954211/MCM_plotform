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

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
    </div>
  );
  if (!competition) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="glass-card rounded-3xl p-12 text-center">
        <p className="text-gray-400">赛题不存在</p>
        <Link href="/competitions" className="text-sm font-medium mt-4 inline-block" style={{ color: config.primaryColor }}>返回赛题列表</Link>
      </div>
    </div>
  );

  const canSubmit = competition.status === 'active' && new Date() <= new Date(competition.endTime);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
      <Link href="/competitions" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-8 transition-colors duration-300">
        <ArrowLeft className="w-4 h-4" /> 返回赛题列表
      </Link>

      <div className="glass-card rounded-3xl p-8 md:p-10 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{competition.title}</h1>
          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold ${getStatusColor(competition.status)}`}>
            {getStatusLabel(competition.status)}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-8">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />开始: {formatDate(competition.startTime)}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />截止: {formatDate(competition.endTime)}</span>
        </div>

        <div className="prose prose-sm max-w-none text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">
          {competition.content}
        </div>

        {(competition.attachmentName || competition.attachments) && (
          <div className="mb-8 flex flex-wrap gap-2">
            {competition.attachmentName && (
              <a href={`/api/download?path=${encodeURIComponent(competition.attachmentPath)}&name=${encodeURIComponent(competition.attachmentName)}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:shadow-md"
                style={{ background: `${config.primaryColor}08`, color: config.primaryColor }}>
                <Paperclip className="w-4 h-4" /> {competition.attachmentName}
              </a>
            )}
            {competition.attachments && (() => {
              try {
                const extras = JSON.parse(competition.attachments);
                if (Array.isArray(extras) && extras.length > 0) {
                  return extras.map((att: any, idx: number) => (
                    <a key={idx} href={`/api/download?path=${encodeURIComponent(att.path)}&name=${encodeURIComponent(att.name)}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:shadow-md"
                      style={{ background: `${config.primaryColor}08`, color: config.primaryColor }}>
                      <Paperclip className="w-4 h-4" /> {att.name}
                    </a>
                  ));
                }
              } catch {}
              return null;
            })()}
          </div>
        )}

        {session && canSubmit && (
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-2xl apple-btn transition-all duration-300"
            style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}>
            <Upload className="w-4 h-4" />
            {showForm ? '取消提交' : '提交论文'}
          </button>
        )}

        {!session && canSubmit && (
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-2xl apple-btn"
            style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}>
            登录后提交
          </Link>
        )}
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-medium ${message.includes('成功') ? 'bg-green-50/80 text-green-600 border border-green-200/50' : 'bg-red-50/80 text-red-600 border border-red-200/50'}`}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="glass-card rounded-3xl p-8 md:p-10 mb-6">
          <h2 className="text-lg font-semibold mb-6 tracking-tight">提交论文</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">团队名称</label>
                <input type="text" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl apple-input text-sm" placeholder="输入团队名称" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">团队成员</label>
                <input type="text" value={form.teamMembers} onChange={(e) => setForm({ ...form, teamMembers: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl apple-input text-sm" placeholder="成员姓名，用逗号分隔" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">备注</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl apple-input text-sm" rows={3} placeholder="其他说明" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">上传论文文件（主文件）</label>
              <input type="file" onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  const maxBytes = config.maxFileSize * 1024 * 1024;
                  if (f && f.size > maxBytes) { setMessage(`文件大小不能超过${config.maxFileSize}MB`); e.target.value = ''; return; }
                  setFile(f);
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-medium file:transition-colors"
                style={{ '--tw-file-bg': `${config.primaryColor}08`, '--tw-file-color': config.primaryColor } as any}
                accept=".pdf,.doc,.docx,.zip,.rar" required />
              <p className="mt-1.5 text-xs text-gray-300">支持 PDF、Word、ZIP、RAR 格式，最大{config.maxFileSize}MB</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                附加文件（可选，可多选）
              </label>
              <input type="file" multiple onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  const maxBytes = config.maxFileSize * 1024 * 1024;
                  const oversized = selected.find(f => f.size > maxBytes);
                  if (oversized) { setMessage(`文件 "${oversized.name}" 大小超过${config.maxFileSize}MB`); e.target.value = ''; return; }
                  setExtraFiles(selected);
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-medium"
                accept=".pdf,.doc,.docx,.zip,.rar,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg" />
              {extraFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {extraFiles.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-black/[0.03] text-gray-600 rounded-xl text-xs">
                      <Paperclip className="w-3 h-3" /> {f.name}
                      <button type="button" onClick={() => setExtraFiles(extraFiles.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={submitting}
              className="px-6 py-3 text-white text-sm font-semibold rounded-2xl disabled:opacity-50 apple-btn transition-all duration-300"
              style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}>
              {submitting ? '提交中...' : '确认提交'}
            </button>
          </form>
        </div>
      )}

      {session && competition.submissions && competition.submissions.length > 0 && (
        <div className="glass-card rounded-3xl p-8 md:p-10">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 tracking-tight">
            <FileText className="w-5 h-5" style={{ color: config.primaryColor }} />
            {session.user.role === 'admin' ? '所有提交' : '我的提交'}
          </h2>
          <div className="space-y-3">
            {competition.submissions
              .filter((s: any) => session.user.role === 'admin' || s.userId === session.user.id)
              .map((sub: any) => (
                <div key={sub.id} className="p-4 rounded-2xl bg-black/[0.02] border border-white/40 transition-all duration-300 hover:bg-black/[0.04]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{sub.fileName}</span>
                    <span className={`px-2.5 py-0.5 rounded-xl text-[11px] font-semibold ${getStatusColor(sub.status)}`}>
                      {getStatusLabel(sub.status)}
                    </span>
                  </div>
                  {sub.teamName && <p className="text-sm text-gray-400">团队: {sub.teamName}</p>}
                  {session.user.role === 'admin' && <p className="text-sm text-gray-400">提交者: {sub.user?.name} ({sub.user?.email})</p>}
                  <p className="text-xs text-gray-300 mt-1">提交时间: {formatDate(sub.createdAt)}</p>
                  {sub.score !== null && sub.score !== undefined && (
                    <div className="mt-2 p-3 rounded-2xl" style={{ background: `${config.primaryColor}08` }}>
                      <p className="text-sm font-semibold" style={{ color: config.primaryColor }}>成绩: {sub.score} 分</p>
                      {sub.feedback && <p className="text-sm mt-1" style={{ color: `${config.primaryColor}99` }}>评语: {sub.feedback}</p>}
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
