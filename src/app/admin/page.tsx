'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Plus, FileText, Users, ChevronDown, ChevronUp, Download, Save, Trash2, Edit3, HardDrive, Upload, X, Paperclip, Megaphone, Pin, Settings, FileDown } from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'competitions' | 'submissions' | 'users' | 'files' | 'announcements' | 'settings'>('competitions');
  const [siteConfigForm, setSiteConfigForm] = useState({
    siteName: '', siteDesc: '', heroTitle: '', heroDesc: '', footerText: '', primaryColor: '#2563eb', logoUrl: '', bannerText: '', bannerEnabled: false, maxFileSize: 10,
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [files, setFiles] = useState<any>({ files: [], totalSize: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingComp, setEditingComp] = useState<any>(null);
  const [compForm, setCompForm] = useState({
    title: '', description: '', content: '', startTime: '', endTime: '', status: 'draft',
  });
  const [compAttachment, setCompAttachment] = useState<File | null>(null);
  const [compExtraAttachments, setCompExtraAttachments] = useState<File[]>([]);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const compFileRef = useRef<HTMLInputElement>(null);
  const compExtraFileRef = useRef<HTMLInputElement>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });
  const [message, setMessage] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: '', school: '', studentId: '', phone: '' });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnn, setEditingAnn] = useState<any>(null);
  const [annForm, setAnnForm] = useState({ title: '', content: '', pinned: false, published: true });

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role !== 'admin') {
        router.push('/');
        return;
      }
      loadData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, session]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, subRes, userRes, fileRes, annRes] = await Promise.all([
        fetch('/api/competitions'),
        fetch('/api/submissions'),
        fetch('/api/admin/users'),
        fetch('/api/admin/files'),
        fetch('/api/announcements?all=true'),
      ]);
      setCompetitions(await compRes.json());
      const subData = await subRes.json();
      setSubmissions(Array.isArray(subData) ? subData : []);
      setUsers(await userRes.json());
      setFiles(await fileRes.json());
      setAnnouncements(await annRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCompSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const url = editingComp ? `/api/competitions/${editingComp.id}` : '/api/competitions';
    const method = editingComp ? 'PUT' : 'POST';

    const formData = new FormData();
    formData.append('title', compForm.title);
    formData.append('description', compForm.description);
    formData.append('content', compForm.content);
    formData.append('startTime', compForm.startTime);
    formData.append('endTime', compForm.endTime);
    formData.append('status', compForm.status);
    if (compAttachment) {
      formData.append('attachment', compAttachment);
    }
    if (removeAttachment) {
      formData.append('removeAttachment', 'true');
    }
    // Extra attachments
    for (const ef of compExtraAttachments) {
      formData.append('extraAttachments', ef);
    }
    // Preserve existing extra attachments when editing
    if (editingComp?.attachments) {
      try {
        const existing = JSON.parse(editingComp.attachments);
        formData.append('existingAttachments', JSON.stringify(existing));
      } catch {}
    }

    try {
      const res = await fetch(url, { method, body: formData });
      if (res.ok) {
        setMessage(editingComp ? '更新成功' : '创建成功');
        setShowForm(false);
        setEditingComp(null);
        setCompForm({ title: '', description: '', content: '', startTime: '', endTime: '', status: 'draft' });
        setCompAttachment(null);
        setCompExtraAttachments([]);
        setRemoveAttachment(false);
        loadData();
      } else {
        const data = await res.json();
        setMessage(data.error || '操作失败');
      }
    } catch {
      setMessage('操作失败');
    }
  };

  const handleDeleteComp = async (id: string) => {
    if (!confirm('确定删除此赛题？关联的提交也将被删除。')) return;
    try {
      await fetch(`/api/competitions/${id}`, { method: 'DELETE' });
      loadData();
    } catch {}
  };

  const handleGrade = async (subId: string) => {
    try {
      const res = await fetch(`/api/submissions/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: gradeForm.score, feedback: gradeForm.feedback, status: 'graded' }),
      });
      if (res.ok) {
        setGradingId(null);
        setGradeForm({ score: '', feedback: '' });
        loadData();
        setMessage('评分成功');
      }
    } catch {
      setMessage('评分失败');
    }
  };

  const startEdit = (comp: any) => {
    setEditingComp(comp);
    setCompForm({
      title: comp.title,
      description: comp.description,
      content: comp.content,
      startTime: new Date(comp.startTime).toISOString().slice(0, 16),
      endTime: new Date(comp.endTime).toISOString().slice(0, 16),
      status: comp.status,
    });
    setCompAttachment(null);
    setRemoveAttachment(false);
    setShowForm(true);
  };

  const startEditUser = (user: any) => {
    setEditingUser(user);
    setUserForm({
      name: user.name, email: user.email, role: user.role,
      school: user.school || '', studentId: user.studentId || '', phone: user.phone || '',
    });
  };

  const handleUserUpdate = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        setEditingUser(null);
        setMessage('用户信息更新成功');
        loadData();
      } else {
        const data = await res.json();
        setMessage(data.error || '更新失败');
      }
    } catch {
      setMessage('更新失败');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定删除此用户？该用户的所有提交和文件也将被删除。')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('用户已删除');
        loadData();
      } else {
        const data = await res.json();
        setMessage(data.error || '删除失败');
      }
    } catch {
      setMessage('删除失败');
    }
  };

  const handleAnnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const url = editingAnn ? `/api/announcements/${editingAnn.id}` : '/api/announcements';
    const method = editingAnn ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annForm),
      });
      if (res.ok) {
        setMessage(editingAnn ? '公告更新成功' : '公告发布成功');
        setShowAnnForm(false);
        setEditingAnn(null);
        setAnnForm({ title: '', content: '', pinned: false, published: true });
        loadData();
      } else {
        const data = await res.json();
        setMessage(data.error || '操作失败');
      }
    } catch {
      setMessage('操作失败');
    }
  };

  const handleDeleteAnn = async (id: string) => {
    if (!confirm('确定删除此公告？')) return;
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      setMessage('公告已删除');
      loadData();
    } catch {}
  };

  const startEditAnn = (ann: any) => {
    setEditingAnn(ann);
    setAnnForm({ title: ann.title, content: ann.content, pinned: ann.pinned, published: ann.published });
    setShowAnnForm(true);
  };

  const handleTogglePin = async (ann: any) => {
    try {
      await fetch(`/api/announcements/${ann.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !ann.pinned }),
      });
      loadData();
    } catch {}
  };

  const handleTogglePublish = async (ann: any) => {
    try {
      await fetch(`/api/announcements/${ann.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !ann.published }),
      });
      loadData();
    } catch {}
  };

  const handleDeleteFile = async (filePath: string) => {
    if (!confirm('确定删除此文件？')) return;
    try {
      const res = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      if (res.ok) {
        setMessage('文件已删除');
        loadData();
      } else {
        setMessage('删除失败');
      }
    } catch {
      setMessage('删除失败');
    }
  };

  if (status === 'loading' || loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">加载中...</div>;
  }

  const tabs = [
    { key: 'competitions' as const, label: '赛题管理', icon: FileText, count: competitions.length },
    { key: 'submissions' as const, label: '提交评审', icon: FileText, count: submissions.length },
    { key: 'users' as const, label: '用户管理', icon: Users, count: users.length },
    { key: 'announcements' as const, label: '公告管理', icon: Megaphone, count: announcements.length },
    { key: 'files' as const, label: '文件存储', icon: HardDrive, count: files.totalCount || 0 },
    { key: 'settings' as const, label: '站点设置', icon: Settings, count: 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-7 h-7 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes('成功') || message.includes('已删除') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
          <button onClick={() => setMessage('')} className="float-right text-xs underline">关闭</button>
        </div>
      )}

      <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ===== 赛题管理 ===== */}
      {tab === 'competitions' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">赛题列表</h2>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingComp(null);
                setCompForm({ title: '', description: '', content: '', startTime: '', endTime: '', status: 'draft' });
                setCompAttachment(null);
                setRemoveAttachment(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
            >
              <Plus className="w-4 h-4" />
              {showForm ? '取消' : '发布赛题'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold mb-4">{editingComp ? '编辑赛题' : '发布新赛题'}</h3>
              <form onSubmit={handleCompSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                    <input
                      type="text" value={compForm.title} onChange={(e) => setCompForm({ ...compForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={compForm.status} onChange={(e) => setCompForm({ ...compForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    >
                      <option value="draft">草稿</option>
                      <option value="active">进行中</option>
                      <option value="ended">已结束</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                  <input
                    type="text" value={compForm.description} onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">赛题详细内容</label>
                  <textarea
                    value={compForm.content} onChange={(e) => setCompForm({ ...compForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" rows={8} required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Paperclip className="w-4 h-4 inline mr-1" />
                    赛题附件（可选，最大10MB）
                  </label>
                  {editingComp?.attachmentName && !removeAttachment && !compAttachment && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg text-sm">
                      <Paperclip className="w-3 h-3 text-blue-600" />
                      <span className="text-blue-700">{editingComp.attachmentName}</span>
                      <button type="button" onClick={() => setRemoveAttachment(true)}
                        className="ml-auto text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
                        <X className="w-3 h-3" /> 移除
                      </button>
                    </div>
                  )}
                  {removeAttachment && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                      附件将被移除
                      <button type="button" onClick={() => setRemoveAttachment(false)} className="text-xs underline ml-2">撤销</button>
                    </div>
                  )}
                  <input
                    ref={compFileRef}
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > 10 * 1024 * 1024) {
                        setMessage('附件大小不能超过10MB');
                        e.target.value = '';
                        return;
                      }
                      setCompAttachment(f);
                      setRemoveAttachment(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {compAttachment && (
                    <p className="text-xs text-gray-500 mt-1">已选择: {compAttachment.name} ({formatFileSize(compAttachment.size)})</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Plus className="w-4 h-4 inline mr-1" />
                    额外附件（可多选）
                  </label>
                  {editingComp?.attachments && (() => {
                    try {
                      const existing = JSON.parse(editingComp.attachments);
                      if (Array.isArray(existing) && existing.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {existing.map((att: any, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                                <Paperclip className="w-3 h-3" /> {att.name}
                              </span>
                            ))}
                          </div>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                  <input
                    ref={compExtraFileRef}
                    type="file"
                    multiple
                    onChange={(e) => {
                      const selected = Array.from(e.target.files || []);
                      setCompExtraAttachments(selected);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {compExtraAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {compExtraAttachments.map((f, i) => (
                        <span key={i} className="text-xs text-gray-500">{f.name} ({formatFileSize(f.size)})</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                    <input
                      type="datetime-local" value={compForm.startTime} onChange={(e) => setCompForm({ ...compForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">截止时间</label>
                    <input
                      type="datetime-local" value={compForm.endTime} onChange={(e) => setCompForm({ ...compForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required
                    />
                  </div>
                </div>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition">
                  {editingComp ? '保存修改' : '发布赛题'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {competitions.map((comp) => (
              <div key={comp.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{comp.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comp.status)}`}>
                        {getStatusLabel(comp.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{comp.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(comp.startTime)} ~ {formatDate(comp.endTime)} | {comp._count?.submissions || 0} 份提交
                    </p>
                    {comp.attachmentName && (
                      <a href={comp.attachmentPath} download className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1 hover:underline">
                        <Paperclip className="w-3 h-3" /> {comp.attachmentName}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(comp)} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">编辑</button>
                    <button onClick={() => handleDeleteComp(comp.id)} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 提交评审 ===== */}
      {tab === 'submissions' && (
        <div>
          <h2 className="text-lg font-semibold mb-6">提交评审</h2>
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-center py-10">暂无提交</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{sub.competition?.title}</h3>
                      <p className="text-sm text-gray-500">
                        提交者: {sub.user?.name} ({sub.user?.email}) {sub.user?.school && `| ${sub.user.school}`}
                      </p>
                      {sub.teamName && <p className="text-sm text-gray-500">团队: {sub.teamName}</p>}
                      <p className="text-sm text-gray-500">文件: {sub.fileName}</p>
                      {sub.extraFiles && (() => {
                        try {
                          const extras = JSON.parse(sub.extraFiles);
                          if (Array.isArray(extras) && extras.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {extras.map((ef: any, idx: number) => (
                                  <a key={idx} href={`/api/download?path=${encodeURIComponent(ef.path)}&name=${encodeURIComponent(ef.name)}`}
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                    <Paperclip className="w-3 h-3" />{ef.name}
                                  </a>
                                ))}
                              </div>
                            );
                          }
                        } catch {}
                        return null;
                      })()}
                      <p className="text-xs text-gray-400 mt-1">提交时间: {formatDate(sub.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                        {getStatusLabel(sub.status)}
                      </span>
                      <div className="flex gap-2">
                        <a
                          href={`/api/download?path=${encodeURIComponent(sub.filePath)}&name=${encodeURIComponent(sub.fileName)}`}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                        >
                          <Download className="w-3 h-3" /> 下载
                        </a>
                        <button
                          onClick={() => {
                            setGradingId(gradingId === sub.id ? null : sub.id);
                            setGradeForm({ score: sub.score?.toString() || '', feedback: sub.feedback || '' });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition"
                        >
                          <Save className="w-3 h-3" /> 评分
                          {gradingId === sub.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {sub.score !== null && sub.score !== undefined && gradingId !== sub.id && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm">
                      <span className="font-medium text-blue-700">成绩: {sub.score} 分</span>
                      {sub.feedback && <span className="text-blue-600 ml-2">| 评语: {sub.feedback}</span>}
                    </div>
                  )}

                  {gradingId === sub.id && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                      <div className="grid md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">分数</label>
                          <input
                            type="number" step="0.1" min="0" max="100"
                            value={gradeForm.score}
                            onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="0-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">评语</label>
                          <input
                            type="text"
                            value={gradeForm.feedback}
                            onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="输入评语"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleGrade(sub.id)}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
                      >
                        确认评分
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 用户管理 ===== */}
      {tab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">用户列表</h2>
            <a
              href="/api/admin/users/export"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
            >
              <FileDown className="w-4 h-4" />
              导出 CSV
            </a>
          </div>

          {editingUser && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">编辑用户: {editingUser.name}</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                  <input type="text" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="user">用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学校</label>
                  <input type="text" value={userForm.school} onChange={(e) => setUserForm({ ...userForm, school: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学号</label>
                  <input type="text" value={userForm.studentId} onChange={(e) => setUserForm({ ...userForm, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机</label>
                  <input type="text" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <button onClick={handleUserUpdate} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
                保存修改
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">姓名</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">邮箱</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">学校</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">学号</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">手机</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">角色</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">提交数</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">注册时间</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 text-gray-500">{user.email}</td>
                      <td className="px-4 py-3 text-gray-500">{user.school || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{user.studentId || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{user.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                          {user.role === 'admin' ? '管理员' : '用户'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{user._count?.submissions || 0}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEditUser(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="编辑">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="删除">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== 公告管理 ===== */}
      {tab === 'announcements' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">公告列表</h2>
            <button
              onClick={() => {
                setShowAnnForm(!showAnnForm);
                setEditingAnn(null);
                setAnnForm({ title: '', content: '', pinned: false, published: true });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
            >
              <Plus className="w-4 h-4" />
              {showAnnForm ? '取消' : '发布公告'}
            </button>
          </div>

          {showAnnForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold mb-4">{editingAnn ? '编辑公告' : '发布新公告'}</h3>
              <form onSubmit={handleAnnSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                  <input
                    type="text" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                  <textarea
                    value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" rows={6} required
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={annForm.pinned} onChange={(e) => setAnnForm({ ...annForm, pinned: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <Pin className="w-4 h-4" /> 置顶
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={annForm.published} onChange={(e) => setAnnForm({ ...annForm, published: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    立即发布
                  </label>
                </div>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition">
                  {editingAnn ? '保存修改' : '发布公告'}
                </button>
              </form>
            </div>
          )}

          {announcements.length === 0 ? (
            <p className="text-gray-500 text-center py-10">暂无公告</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className={`bg-white rounded-xl border p-5 ${ann.pinned ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {ann.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        <h3 className="font-semibold text-gray-900 truncate">{ann.title}</h3>
                        {!ann.published && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">未发布</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">{ann.content}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(ann.createdAt)}</p>
                    </div>
                    <div className="flex gap-1 ml-4 flex-shrink-0">
                      <button onClick={() => handleTogglePin(ann)}
                        className={`p-1.5 rounded-lg transition ${ann.pinned ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-gray-400 hover:bg-gray-50 hover:text-amber-500'}`}
                        title={ann.pinned ? '取消置顶' : '置顶'}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleTogglePublish(ann)}
                        className={`p-1.5 rounded-lg transition text-xs font-medium ${ann.published ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-50 hover:text-green-500'}`}
                        title={ann.published ? '取消发布' : '发布'}>
                        {ann.published ? '已发布' : '未发布'}
                      </button>
                      <button onClick={() => startEditAnn(ann)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="编辑">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteAnn(ann.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 文件存储 ===== */}
      {tab === 'files' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">文件存储管理</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span><HardDrive className="w-4 h-4 inline mr-1" />{files.totalCount || 0} 个文件</span>
              <span>总大小: {formatFileSize(files.totalSize || 0)}</span>
            </div>
          </div>

          {(!files.files || files.files.length === 0) ? (
            <p className="text-gray-500 text-center py-10">暂无文件</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">文件名</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">分类</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">大小</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">修改时间</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {files.files.map((file: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate" title={file.name}>{file.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${file.category === '赛题附件' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {file.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatFileSize(file.size)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(file.modifiedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <a href={`/api/download?path=${encodeURIComponent(file.path)}&name=${encodeURIComponent(file.name)}`} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition" title="下载">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button onClick={() => handleDeleteFile(file.path)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="删除">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 站点设置 ===== */}
      {tab === 'settings' && (
        <SiteSettingsPanel
          form={siteConfigForm}
          setForm={setSiteConfigForm}
          loaded={configLoaded}
          setLoaded={setConfigLoaded}
          setMessage={setMessage}
        />
      )}
    </div>
  );
}

function SiteSettingsPanel({ form, setForm, loaded, setLoaded, setMessage }: {
  form: any; setForm: (f: any) => void; loaded: boolean; setLoaded: (v: boolean) => void; setMessage: (m: string) => void;
}) {
  useEffect(() => {
    if (!loaded) {
      fetch('/api/site-config').then(r => r.json()).then(data => {
        if (data && data.siteName) {
          setForm({
            siteName: data.siteName || '',
            siteDesc: data.siteDesc || '',
            heroTitle: data.heroTitle || '',
            heroDesc: data.heroDesc || '',
            footerText: data.footerText || '',
            primaryColor: data.primaryColor || '#2563eb',
            logoUrl: data.logoUrl || '',
            bannerText: data.bannerText || '',
            bannerEnabled: data.bannerEnabled || false,
            maxFileSize: data.maxFileSize || 10,
          });
        }
        setLoaded(true);
      }).catch(() => setLoaded(true));
    }
  }, [loaded]);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage('站点设置已保存，刷新页面后生效');
      } else {
        setMessage('保存失败');
      }
    } catch {
      setMessage('保存失败');
    }
  };

  const colorPresets = [
    { name: '蓝色', value: '#2563eb' },
    { name: '紫色', value: '#7c3aed' },
    { name: '绿色', value: '#059669' },
    { name: '红色', value: '#dc2626' },
    { name: '橙色', value: '#ea580c' },
    { name: '青色', value: '#0891b2' },
    { name: '靛蓝', value: '#4f46e5' },
    { name: '粉色', value: '#db2777' },
  ];

  if (!loaded) return <div className="text-center py-10 text-gray-500">加载中...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">站点设置</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-medium text-gray-900 border-b pb-3">基本信息</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">站点名称</label>
            <input value={form.siteName} onChange={e => setForm({ ...form, siteName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">站点描述</label>
            <input value={form.siteDesc} onChange={e => setForm({ ...form, siteDesc: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (可选)</label>
            <input value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">页脚文字</label>
            <input value={form.footerText} onChange={e => setForm({ ...form, footerText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-medium text-gray-900 border-b pb-3">首页横幅</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">横幅标题</label>
            <input value={form.heroTitle} onChange={e => setForm({ ...form, heroTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">横幅描述</label>
            <input value={form.heroDesc} onChange={e => setForm({ ...form, heroDesc: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-medium text-gray-900 border-b pb-3">主题色</h3>
        <div className="flex flex-wrap gap-3">
          {colorPresets.map(c => (
            <button key={c.value} onClick={() => setForm({ ...form, primaryColor: c.value })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                form.primaryColor === c.value ? 'border-gray-900 bg-gray-50 font-medium' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: c.value }}></span>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">自定义:</label>
          <input type="color" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })}
            className="w-10 h-10 rounded cursor-pointer border-0" />
          <span className="text-sm text-gray-500 font-mono">{form.primaryColor}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-medium text-gray-900 border-b pb-3">顶部公告条</h3>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.bannerEnabled}
              onChange={e => setForm({ ...form, bannerEnabled: e.target.checked })}
              className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
          <span className="text-sm text-gray-700">启用顶部公告条</span>
        </div>
        {form.bannerEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">公告内容</label>
            <input value={form.bannerText} onChange={e => setForm({ ...form, bannerText: e.target.value })}
              placeholder="例如：系统将于今晚维护，请提前保存数据"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-medium text-gray-900 border-b pb-3">上传限制</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">单文件大小限制 (MB)</label>
          <div className="flex items-center gap-4">
            <input type="range" min="1" max="200" value={form.maxFileSize}
              onChange={e => setForm({ ...form, maxFileSize: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            <div className="flex items-center gap-1">
              <input type="number" min="1" max="200" value={form.maxFileSize}
                onChange={e => setForm({ ...form, maxFileSize: Math.max(1, Math.min(200, parseInt(e.target.value) || 10)) })}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center" />
              <span className="text-sm text-gray-500">MB</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">适用于赛题附件和参赛提交文件，建议设置为 10~50 MB</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">保存后刷新页面即可看到变化</p>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition text-sm">
          <Save className="w-4 h-4" />
          保存设置
        </button>
      </div>
    </div>
  );
}
