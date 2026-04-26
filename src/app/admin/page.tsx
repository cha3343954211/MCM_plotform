'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Plus, FileText, Users, ChevronDown, ChevronUp, Download, Save, Trash2, Edit3, HardDrive, Upload, X, Paperclip, Megaphone, Pin, Settings, FileDown, Activity, CheckCircle2, XCircle, Key, Sparkles, Send, Bell, Search, BarChart3, Layers } from 'lucide-react';
import MarkdownEditor from '@/components/MarkdownEditor';
import { formatDate, getStatusLabel, getStatusColor, AWARD_OPTIONS, getAwardLabel, getAwardColor, GRADIENT_PRESETS, buildHeroGradient } from '@/lib/utils';
import { canReview, isAdminRole, isSuperAdminRole, roleLabel } from '@/lib/roles';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function toDatetimeLocal(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const canReviewSubmissions = canReview(session?.user?.role);
  const canAward = isSuperAdminRole(session?.user?.role);
  const [tab, setTab] = useState<'dashboard' | 'competitions' | 'templates' | 'submissions' | 'teams' | 'users' | 'files' | 'announcements' | 'loginLogs' | 'cleanup' | 'settings' | 'notifications'>('dashboard');
  const [siteConfigForm, setSiteConfigForm] = useState({
    siteName: '', siteDesc: '', heroTitle: '', heroDesc: '', footerText: '', primaryColor: '#2563eb', secondaryColor: '', gradientEnabled: false, gradientAngle: 160, logoUrl: '', bannerText: '', bannerEnabled: false, maxFileSize: 10, maxSubmissionVersions: 5, commentsEnabled: true,
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [files, setFiles] = useState<any>({ files: [], totalSize: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingComp, setEditingComp] = useState<any>(null);
  const [compForm, setCompForm] = useState({
    title: '', description: '', content: '', startTime: '', endTime: '', status: 'draft', teamMaxMembers: 5,
  });
  const [compAttachment, setCompAttachment] = useState<File | null>(null);
  const [compExtraAttachments, setCompExtraAttachments] = useState<File[]>([]);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const compFileRef = useRef<HTMLInputElement>(null);
  const compExtraFileRef = useRef<HTMLInputElement>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '', award: '', showcased: false });
  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamCompetitionFilter, setTeamCompetitionFilter] = useState('all');
  const [collapsedTeamComps, setCollapsedTeamComps] = useState<Set<string>>(new Set());
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());
  // 批量操作
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: '', school: '', studentId: '', phone: '' });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnn, setEditingAnn] = useState<any>(null);
  const [annForm, setAnnForm] = useState({ title: '', content: '', pinned: false, published: true });
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'true' | 'false'>('all');

  // 通知发送
  const [notifyMode, setNotifyMode] = useState<'all' | 'users'>('all');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyContent, setNotifyContent] = useState('');
  const [notifyLink, setNotifyLink] = useState('');
  const [notifyUserSearch, setNotifyUserSearch] = useState('');
  const [notifySelectedUsers, setNotifySelectedUsers] = useState<Set<string>>(new Set());
  const [notifySending, setNotifySending] = useState(false);

  const loadCompetitions = useCallback(async () => {
    const res = await fetch('/api/competitions', { cache: 'no-store' });
    const data = await res.json();
    setCompetitions(Array.isArray(data) ? data : []);
  }, []);

  const loadSubmissions = useCallback(async () => {
    const res = await fetch('/api/submissions', { cache: 'no-store' });
    const data = await res.json();
    setSubmissions(Array.isArray(data) ? data : []);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }, []);

  const loadTeams = useCallback(async () => {
    const res = await fetch('/api/teams?admin=1', { cache: 'no-store' });
    const data = await res.json();
    setTeams(Array.isArray(data) ? data : []);
  }, []);

  const loadFiles = useCallback(async () => {
    const res = await fetch('/api/admin/files', { cache: 'no-store' });
    setFiles(await res.json());
    setLoadedTabs((prev) => new Set(prev).add('files'));
  }, []);

  const loadAnnouncements = useCallback(async () => {
    const res = await fetch('/api/announcements?all=true', { cache: 'no-store' });
    const data = await res.json();
    setAnnouncements(Array.isArray(data) ? data : []);
    setLoadedTabs((prev) => new Set(prev).add('announcements'));
  }, []);

  const loadLoginLogs = useCallback(async () => {
    const res = await fetch('/api/admin/login-logs', { cache: 'no-store' });
    const data = await res.json();
    setLoginLogs(Array.isArray(data) ? data : []);
    setLoadedTabs((prev) => new Set(prev).add('loginLogs'));
  }, []);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      await Promise.all([
        loadCompetitions(),
        loadSubmissions(),
        loadTeams(),
        loadUsers(),
      ]);
    } catch (e) {
      console.error(e);
    }
    if (showSpinner) setLoading(false);
  }, [loadCompetitions, loadSubmissions, loadTeams, loadUsers]);

  useEffect(() => {
    if (status !== 'authenticated' || !isAdminRole(session?.user?.role)) return;
    if (tab === 'files' && !loadedTabs.has('files')) loadFiles();
    if (tab === 'announcements' && !loadedTabs.has('announcements')) loadAnnouncements();
    if (tab === 'loginLogs' && !loadedTabs.has('loginLogs')) loadLoginLogs();
  }, [loadedTabs, loadAnnouncements, loadFiles, loadLoginLogs, session?.user?.role, status, tab]);

  useEffect(() => {
    if (status === 'authenticated') {
      if (!isAdminRole(session?.user?.role)) {
        router.push('/');
        return;
      }
      loadData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, session?.user?.role, router, loadData]);

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
    formData.append('teamMaxMembers', String(compForm.teamMaxMembers));
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
        setCompForm({ title: '', description: '', content: '', startTime: '', endTime: '', status: 'draft', teamMaxMembers: 5 });
        setCompAttachment(null);
        setCompExtraAttachments([]);
        setRemoveAttachment(false);
        Promise.all([loadCompetitions(), loadFiles()]);
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
      Promise.all([loadCompetitions(), loadSubmissions(), loadFiles()]);
    } catch {}
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('确定删除此提交？文件也将被删除，且无法恢复。')) return;
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('提交已删除');
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json();
        setMessage(data.error || '删除失败');
      }
    } catch {
      setMessage('删除失败');
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('确定解散此团队？团队下的提交不会删除，但会解除团队关联。')) return;
    try {
      const res = await fetch(`/api/teams/${id}?action=disband`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage('团队已解散');
        await Promise.all([loadTeams(), loadSubmissions()]);
      } else {
        setMessage(data.error || '解散团队失败');
      }
    } catch {
      setMessage('解散团队失败');
    }
  };

  const handleClearOldLogs = async (days: number) => {
    if (!confirm(`确定清理 ${days} 天前的登录日志？`)) return;
    try {
      const res = await fetch(`/api/admin/login-logs?days=${days}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage(`已清理 ${data.deleted} 条旧日志`);
        loadLoginLogs();
      } else {
        setMessage(data.error || '清理失败');
      }
    } catch {
      setMessage('清理失败');
    }
  };

  const handleGrade = async (subId: string) => {
    try {
      const res = await fetch(`/api/submissions/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: gradeForm.score, feedback: gradeForm.feedback, award: gradeForm.award, showcased: gradeForm.showcased, status: 'graded' }),
      });
      if (res.ok) {
        setGradingId(null);
        setGradeForm({ score: '', feedback: '', award: '', showcased: false });
        setMessage('评分成功');
        loadSubmissions();
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
      content: comp.content || '',
      startTime: toDatetimeLocal(comp.startTime),
      endTime: toDatetimeLocal(comp.endTime),
      status: comp.status,
      teamMaxMembers: comp.teamMaxMembers || 5,
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
        loadUsers();
      } else {
        const data = await res.json();
        setMessage(data.error || '更新失败');
      }
    } catch {
      setMessage('更新失败');
    }
  };

  const handleResetPassword = async (user: any) => {
    const customPwd = prompt(`为 "${user.name}" (${user.email}) 重置密码：\n\n留空则自动生成 10 位随机密码`);
    if (customPwd === null) return; // 取消
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: customPwd || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`密码重置成功！\n\n新密码: ${data.newPassword}\n\n请务必记录并告知用户。`);
      } else {
        setMessage(data.error || '重置失败');
      }
    } catch {
      setMessage('重置失败');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定删除此用户？该用户的所有提交和文件也将被删除。')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('用户已删除');
        Promise.all([loadUsers(), loadSubmissions(), loadFiles()]);
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
        loadAnnouncements();
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
      loadAnnouncements();
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
      loadAnnouncements();
    } catch {}
  };

  const handleTogglePublish = async (ann: any) => {
    try {
      await fetch(`/api/announcements/${ann.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !ann.published }),
      });
      loadAnnouncements();
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
        loadFiles();
      } else {
        setMessage('删除失败');
      }
    } catch {
      setMessage('删除失败');
    }
  };

  const subGroupList = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    const filtered = submissions.filter((s: any) => {
      if (subStatusFilter !== 'all' && s.status !== subStatusFilter) return false;
      if (!q) return true;
      return (s.user?.name || '').toLowerCase().includes(q)
        || (s.user?.email || '').toLowerCase().includes(q)
        || (s.teamName || '').toLowerCase().includes(q)
        || (s.user?.school || '').toLowerCase().includes(q);
    });

    const groups = new Map<string, { competition: any; subs: any[] }>();
    for (const s of filtered) {
      const key = s.competitionId;
      if (!groups.has(key)) groups.set(key, { competition: s.competition, subs: [] });
      groups.get(key)!.subs.push(s);
    }
    return Array.from(groups.entries());
  }, [subSearch, subStatusFilter, submissions]);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    return teams.filter((team: any) => {
      if (teamCompetitionFilter !== 'all' && team.competitionId !== teamCompetitionFilter) return false;
      if (!q) return true;
      return (team.name || '').toLowerCase().includes(q)
        || (team.inviteCode || '').toLowerCase().includes(q)
        || (team.leader?.name || '').toLowerCase().includes(q)
        || (team.leader?.email || '').toLowerCase().includes(q)
        || (team.competition?.title || '').toLowerCase().includes(q)
        || (team.members || []).some((m: any) =>
          (m.user?.name || '').toLowerCase().includes(q)
          || (m.user?.email || '').toLowerCase().includes(q)
          || (m.user?.school || '').toLowerCase().includes(q)
        );
    });
  }, [teamCompetitionFilter, teamSearch, teams]);

  const groupedTeams = useMemo(() => {
    const groups = new Map<string, { competition: any; teams: any[] }>();
    for (const team of filteredTeams) {
      const key = team.competitionId || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, { competition: team.competition || { id: key, title: '未关联赛题' }, teams: [] });
      }
      groups.get(key)!.teams.push(team);
    }
    return Array.from(groups.entries());
  }, [filteredTeams]);

  if (status === 'loading' || loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">加载中...</div>;
  }

  const tabs = [
    { key: 'dashboard' as const, label: '总览', icon: BarChart3, count: 0 },
    { key: 'competitions' as const, label: '赛题管理', icon: FileText, count: competitions.length },
    { key: 'templates' as const, label: '赛题模板', icon: Layers, count: 0 },
    { key: 'submissions' as const, label: '提交评审', icon: FileText, count: submissions.length },
    { key: 'teams' as const, label: '团队管理', icon: Users, count: teams.length },
    { key: 'users' as const, label: '用户管理', icon: Users, count: users.length },
    { key: 'announcements' as const, label: '公告管理', icon: Megaphone, count: announcements.length },
    { key: 'files' as const, label: '文件存储', icon: HardDrive, count: files.totalCount || 0 },
    { key: 'loginLogs' as const, label: '登录日志', icon: Activity, count: loginLogs.length },
    { key: 'cleanup' as const, label: '数据清理', icon: Sparkles, count: 0 },
    { key: 'notifications' as const, label: '通知发送', icon: Bell, count: 0 },
    { key: 'settings' as const, label: '站点设置', icon: Settings, count: 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">管理后台</h1>
          <p className="text-gray-400 text-sm">管理赛题、提交、用户和站点配置</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-center justify-between ${message.includes('成功') || message.includes('已删除') ? 'bg-green-50/80 text-green-600 border border-green-200/50' : 'bg-red-50/80 text-red-600 border border-red-200/50'}`}>
          {message}
          <button onClick={() => setMessage('')} className="text-xs opacity-60 hover:opacity-100 transition-opacity">关闭</button>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-black/[0.03] rounded-2xl mb-8 overflow-x-auto touch-scroll">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
              tab === t.key
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count > 0 && <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-lg">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ===== 赛题管理 ===== */}
      {tab === 'competitions' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold">赛题列表</h2>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingComp(null);
                setCompForm({ title: '', description: '', content: '', startTime: '', endTime: '', status: 'draft', teamMaxMembers: 5 });
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">赛题详细内容 <span className="text-xs text-gray-400 font-normal">（支持 Markdown）</span></label>
                  <MarkdownEditor
                    value={compForm.content}
                    onChange={(v) => setCompForm({ ...compForm, content: v })}
                    rows={10}
                    required
                    placeholder="支持 Markdown 语法。使用 #/##/### 标题, - 列表, **加粗**, `code`, 表格等"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">每队人数上限</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={compForm.teamMaxMembers}
                    onChange={(e) => setCompForm({ ...compForm, teamMaxMembers: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) })}
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">用户创建该赛题团队时，将统一使用此人数上限。</p>
                </div>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition">
                  {editingComp ? '保存修改' : '发布赛题'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {competitions.map((comp) => (
              <div key={comp.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{comp.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comp.status)}`}>
                        {getStatusLabel(comp.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{comp.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(comp.startTime)} ~ {formatDate(comp.endTime)} | 每队最多 {comp.teamMaxMembers || 5} 人 | {comp._count?.submissions || 0} 份提交
                    </p>
                    {comp.attachmentName && (
                      <a href={comp.attachmentPath} download className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1 hover:underline">
                        <Paperclip className="w-3 h-3" /> {comp.attachmentName}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => startEdit(comp)} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">编辑</button>
                    <button onClick={() => handleDeleteComp(comp.id)} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 提交评审 (按赛题分组) ===== */}
      {tab === 'submissions' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold">提交评审</h2>
              <p className="text-gray-400 text-sm mt-0.5">按赛题分组管理所有提交，方便集中评分</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={subSearch} onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="搜索学生/邮箱/团队..."
                  className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl w-full sm:w-56 outline-none focus:border-gray-400 transition" />
              </div>
              <div className="flex flex-wrap gap-1 p-1 bg-black/[0.03] rounded-xl">
                {[
                  { k: 'all' as const, label: '全部' },
                  { k: 'pending' as const, label: '待评审' },
                  { k: 'graded' as const, label: '已评分' },
                ].map((f) => (
                  <button key={f.k} onClick={() => setSubStatusFilter(f.k)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                      subStatusFilter === f.k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}>{f.label}</button>
                ))}
              </div>
              <button onClick={() => {
                const allIds = new Set<string>(submissions.map((s: any) => s.competitionId));
                setExpandedComps(expandedComps.size === allIds.size ? new Set() : allIds);
              }}
                className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition whitespace-nowrap">
                {expandedComps.size > 0 ? '全部折叠' : '全部展开'}
              </button>
            </div>
          </div>

          {submissions.length === 0 ? (
            <p className="text-gray-500 text-center py-10 bg-white rounded-2xl border border-gray-200">暂无提交</p>
          ) : subGroupList.length === 0 ? (
            <p className="text-gray-400 text-center py-12 bg-white rounded-2xl border border-gray-200/80">没有匹配的提交</p>
          ) : (
              <div className="space-y-3">
                {subGroupList.map(([compId, { competition, subs }]) => {
                  const isExpanded = expandedComps.has(compId);
                  const pendingCount = subs.filter((s: any) => s.status !== 'graded').length;
                  const gradedCount = subs.length - pendingCount;
                  const toggle = () => {
                    const next = new Set(expandedComps);
                    if (isExpanded) next.delete(compId); else next.add(compId);
                    setExpandedComps(next);
                  };
                  return (
                    <div key={compId} className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden transition-all">
                      {/* 赛题卡片头 */}
                      <button onClick={toggle}
                        className="w-full flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors text-left">
                        <HardDrive className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">{competition?.title || '未知赛题'}</h3>
                            {competition?.status && (
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${getStatusColor(competition.status)}`}>
                                {getStatusLabel(competition.status)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                            <span>共 <b className="text-gray-700">{subs.length}</b> 份</span>
                            {pendingCount > 0 && <span className="text-amber-600">待评审 {pendingCount}</span>}
                            {gradedCount > 0 && <span className="text-green-600">已评分 {gradedCount}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {pendingCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 ring-1 ring-amber-200/50">
                              {pendingCount} 待评
                            </span>
                          )}
                          <a
                            href={`/api/competitions/${compId}/export`}
                            onClick={(e) => e.stopPropagation()}
                            title="打包导出该赛题所有最新提交"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-900 text-white hover:bg-gray-800 transition"
                          >
                            <Download className="w-3 h-3" /> ZIP
                          </a>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                      </button>

                      {/* 展开的提交列表 */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100 bg-gray-50/30">
                          {subs.map((sub: any) => (
                <div key={sub.id} className={`bg-white rounded-xl border p-4 sm:p-5 transition ${selectedSubs.has(sub.id) ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-2">
                    <div className="min-w-0 flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedSubs.has(sub.id)}
                        onChange={(e) => {
                          const next = new Set(selectedSubs);
                          if (e.target.checked) next.add(sub.id); else next.delete(sub.id);
                          setSelectedSubs(next);
                        }}
                        className="mt-1.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        title="选中以批量操作"
                      />
                      <div className="min-w-0">
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
                    </div>
                    <div className="flex flex-col items-start lg:items-end gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                        {getStatusLabel(sub.status)}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/api/download?path=${encodeURIComponent(sub.filePath)}&name=${encodeURIComponent(sub.fileName)}`}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                        >
                          <Download className="w-3 h-3" /> 下载
                        </a>
                        {canReviewSubmissions && (
                          <button
                            onClick={() => {
                              setGradingId(gradingId === sub.id ? null : sub.id);
                              setGradeForm({ score: sub.score?.toString() || '', feedback: sub.feedback || '', award: sub.award || '', showcased: sub.showcased || false });
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition"
                          >
                            <Save className="w-3 h-3" /> 后台评审
                            {gradingId === sub.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSubmission(sub.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                          title="删除提交"
                        >
                          <Trash2 className="w-3 h-3" /> 删除
                        </button>
                      </div>
                    </div>
                  </div>

                  {sub.score !== null && sub.score !== undefined && gradingId !== sub.id && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm flex flex-wrap items-center gap-2">
                      <span className="font-medium text-blue-700">成绩: {sub.score} 分</span>
                      {sub.feedback && <span className="text-blue-600">| 评语: {sub.feedback}</span>}
                      {sub.award && <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ring-1 ${getAwardColor(sub.award)}`}>{getAwardLabel(sub.award)}</span>}
                      {sub.showcased && <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 ring-1 ring-purple-200/50">已公示</span>}
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
                      {canAward && (
                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">奖项等级</label>
                            <div className="flex gap-2">
                              <select
                                value={AWARD_OPTIONS.some(o => o.value === gradeForm.award) ? gradeForm.award : '__custom__'}
                                onChange={(e) => {
                                  if (e.target.value === '__custom__') {
                                    setGradeForm({ ...gradeForm, award: '' });
                                  } else {
                                    setGradeForm({ ...gradeForm, award: e.target.value });
                                  }
                                }}
                                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                              >
                                {AWARD_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                                <option value="__custom__">自定义奖项...</option>
                              </select>
                              {(!AWARD_OPTIONS.some(o => o.value === gradeForm.award) || gradeForm.award === '') && (
                                <input
                                  type="text"
                                  value={AWARD_OPTIONS.some(o => o.value === gradeForm.award) ? '' : gradeForm.award}
                                  onChange={(e) => setGradeForm({ ...gradeForm, award: e.target.value })}
                                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                  placeholder="输入自定义奖项名称"
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={gradeForm.showcased}
                                onChange={(e) => setGradeForm({ ...gradeForm, showcased: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                              <span className="text-sm text-gray-700">在论文公示板展示</span>
                            </label>
                          </div>
                        </div>
                      )}
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
                  );
                })}
              </div>
          )}
        </div>
      )}

      {/* ===== 团队管理 ===== */}
      {tab === 'teams' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
              <h2 className="text-lg font-semibold">团队管理</h2>
              <p className="text-sm text-gray-400 mt-1">查看各赛题团队、队长、成员与提交情况</p>
            </div>
            <button
              onClick={() => loadTeams()}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              刷新
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="搜索团队名、邀请码、队长、成员、学校或赛题"
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition"
              />
            </div>
            <select
              value={teamCompetitionFilter}
              onChange={(e) => setTeamCompetitionFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition"
            >
              <option value="all">全部赛题</option>
              {competitions.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4">
            {groupedTeams.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                暂无团队
              </div>
            ) : groupedTeams.map(([compId, group]: any) => {
              const collapsed = collapsedTeamComps.has(compId);
              return (
                <div key={compId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => {
                      const next = new Set(collapsedTeamComps);
                      if (next.has(compId)) next.delete(compId); else next.add(compId);
                      setCollapsedTeamComps(next);
                    }}
                    className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition text-left"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.competition?.title || '未关联赛题'}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">团队 {group.teams.length} 个</p>
                    </div>
                    {collapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                  </button>

                  {!collapsed && (
                    <div className="p-4 grid gap-4">
                      {group.teams.map((team: any) => (
              <div key={team.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{team.name}</h3>
                      <span className="px-2 py-0.5 rounded-lg text-xs bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                        邀请码：{team.inviteCode}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">赛题：{team.competition?.title || '-'}</p>
                    <p className="text-sm text-gray-500 mt-1">队长：{team.leader?.name || '-'} {team.leader?.email ? `(${team.leader.email})` : ''}</p>
                    <p className="text-xs text-gray-400 mt-1">创建时间：{formatDate(team.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs bg-gray-50 text-gray-600">
                      {team._count?.members || team.members?.length || 0}/{team.maxMembers} 人
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs bg-green-50 text-green-600">
                      提交 {team._count?.submissions || 0}
                    </span>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    >
                      解散团队
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-y border-gray-100">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">成员</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">邮箱</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">学校</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">身份</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">加入时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {team.members?.map((m: any) => (
                        <tr key={m.userId}>
                          <td className="px-3 py-2 font-medium text-gray-800">{m.user?.name || '-'}</td>
                          <td className="px-3 py-2 text-gray-500">{m.user?.email || '-'}</td>
                          <td className="px-3 py-2 text-gray-500">{m.user?.school || '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${m.role === 'leader' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'}`}>
                              {m.role === 'leader' ? '队长' : '成员'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-400">{formatDate(m.joinedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {team.submissions?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">团队提交文件</h4>
                    <div className="grid gap-2">
                      {team.submissions.map((sub: any) => (
                        <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-gray-50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{sub.fileName}</p>
                            <p className="text-xs text-gray-400">
                              提交者：{sub.user?.name || '-'} · {formatDate(sub.createdAt)}
                              {sub.score !== null && sub.score !== undefined ? ` · ${sub.score} 分` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/api/download?path=${encodeURIComponent(sub.filePath)}&name=${encodeURIComponent(sub.fileName)}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-white text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200 transition"
                            >
                              <Download className="w-3 h-3" /> 下载主文件
                            </a>
                            {sub.extraFiles && (() => {
                              try {
                                const extras = JSON.parse(sub.extraFiles);
                                if (!Array.isArray(extras) || extras.length === 0) return null;
                                return extras.map((ef: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={`/api/download?path=${encodeURIComponent(ef.path)}&name=${encodeURIComponent(ef.name)}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-white text-blue-600 rounded-lg hover:bg-blue-50 border border-blue-100 transition"
                                  >
                                    <Paperclip className="w-3 h-3" /> 附件{idx + 1}
                                  </a>
                                ));
                              } catch { return null; }
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                    <option value="judge">评委</option>
                    <option value="admin">管理员</option>
                    <option value="super_admin">高级管理员</option>
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'super_admin' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/50'
                            : user.role === 'admin' ? 'bg-primary-100 text-primary-700'
                            : user.role === 'judge' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/50'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{user._count?.submissions || 0}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEditUser(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="编辑">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleResetPassword(user)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="重置密码">
                            <Key className="w-3.5 h-3.5" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容 <span className="text-xs text-gray-400 font-normal">（支持 Markdown）</span></label>
                  <MarkdownEditor
                    value={annForm.content}
                    onChange={(v) => setAnnForm({ ...annForm, content: v })}
                    rows={6}
                    required
                    placeholder="支持 Markdown 语法..."
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

      {/* ===== 登录日志 ===== */}
      {tab === 'loginLogs' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
              <h2 className="text-lg font-semibold">登录日志</h2>
              <p className="text-gray-400 text-sm mt-0.5">最近 {loginLogs.length} 条记录，用于追踪登录安全</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-1 bg-black/[0.03] rounded-xl">
                {[
                  { k: 'all' as const, label: '全部' },
                  { k: 'true' as const, label: '成功' },
                  { k: 'false' as const, label: '失败' },
                ].map((f) => (
                  <button key={f.k} onClick={() => setLogFilter(f.k)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      logFilter === f.k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}>{f.label}</button>
                ))}
              </div>
              <button onClick={() => handleClearOldLogs(30)}
                className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition">
                清理30天前
              </button>
            </div>
          </div>

          {(() => {
            const filtered = logFilter === 'all' ? loginLogs : loginLogs.filter((l) => String(l.success) === logFilter);
            const successCount = loginLogs.filter((l) => l.success).length;
            const failCount = loginLogs.length - successCount;

            return (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-white rounded-2xl border border-gray-200/80 p-4">
                    <div className="text-xs text-gray-400 mb-1">总记录</div>
                    <div className="text-2xl font-bold text-gray-900">{loginLogs.length}</div>
                  </div>
                  <div className="bg-green-50/60 rounded-2xl border border-green-200/50 p-4">
                    <div className="text-xs text-green-600 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 成功</div>
                    <div className="text-2xl font-bold text-green-700">{successCount}</div>
                  </div>
                  <div className="bg-red-50/60 rounded-2xl border border-red-200/50 p-4">
                    <div className="text-xs text-red-600 mb-1 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> 失败</div>
                    <div className="text-2xl font-bold text-red-700">{failCount}</div>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <p className="text-gray-400 text-center py-12 bg-white rounded-2xl border border-gray-200/80">暂无日志</p>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50/50">
                          <tr className="text-left text-xs text-gray-500">
                            <th className="px-4 py-3 font-medium">时间</th>
                            <th className="px-4 py-3 font-medium">邮箱</th>
                            <th className="px-4 py-3 font-medium">状态</th>
                            <th className="px-4 py-3 font-medium">IP</th>
                            <th className="px-4 py-3 font-medium">原因</th>
                            <th className="px-4 py-3 font-medium">User-Agent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filtered.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                              <td className="px-4 py-3 text-gray-900 font-medium">{log.email}</td>
                              <td className="px-4 py-3">
                                {log.success ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-green-50 text-green-600 ring-1 ring-green-200/50">
                                    <CheckCircle2 className="w-3 h-3" /> 成功
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 ring-1 ring-red-200/50">
                                    <XCircle className="w-3 h-3" /> 失败
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.ip || '-'}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{log.reason || '-'}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate" title={log.userAgent || ''}>{log.userAgent || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ===== 数据清理 ===== */}
      {tab === 'cleanup' && <CleanupPanel onMessage={setMessage} />}

      {/* ===== 通知发送 ===== */}
      {tab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Bell className="w-5 h-5" /> 发送通知</h2>
              <p className="text-gray-400 text-sm mt-0.5">向全体用户或指定用户推送系统通知</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-5">
            {/* 发送模式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">发送对象</label>
              <div className="flex gap-1 p-1 bg-black/[0.03] rounded-xl w-fit">
                <button onClick={() => setNotifyMode('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${notifyMode === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  全体用户
                </button>
                <button onClick={() => setNotifyMode('users')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${notifyMode === 'users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  指定用户
                </button>
              </div>
            </div>

            {/* 指定用户选择 */}
            {notifyMode === 'users' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择用户 <span className="text-gray-400 font-normal">({notifySelectedUsers.size} 人已选)</span>
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input type="text" value={notifyUserSearch} onChange={(e) => setNotifyUserSearch(e.target.value)}
                    placeholder="搜索姓名、邮箱、学号..."
                    className="w-full sm:w-72 pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition" />
                </div>
                <div className="max-h-64 overflow-y-auto touch-scroll border border-gray-100 rounded-xl">
                  <div className="divide-y divide-gray-50">
                    {(() => {
                      const term = notifyUserSearch.trim().toLowerCase();
                      const filtered = term
                        ? users.filter((u: any) =>
                            (u.name && u.name.toLowerCase().includes(term)) ||
                            (u.email && u.email.toLowerCase().includes(term)) ||
                            (u.studentId && u.studentId.toLowerCase().includes(term)) ||
                            (u.school && u.school.toLowerCase().includes(term))
                          )
                        : users.slice(0, 50);
                      if (filtered.length === 0) {
                        return <div className="px-4 py-6 text-center text-sm text-gray-400">无匹配用户</div>;
                      }
                      return filtered.map((u: any) => (
                        <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={notifySelectedUsers.has(u.id)}
                            onChange={(e) => {
                              const next = new Set(notifySelectedUsers);
                              if (e.target.checked) next.add(u.id);
                              else next.delete(u.id);
                              setNotifySelectedUsers(next);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{u.name}</div>
                            <div className="text-xs text-gray-400 truncate">{u.email}{u.school ? ` · ${u.school}` : ''}{u.studentId ? ` · ${u.studentId}` : ''}</div>
                          </div>
                        </label>
                      ));
                    })()}
                  </div>
                </div>
                {notifySelectedUsers.size > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from(notifySelectedUsers).map((id) => {
                      const u = users.find((x: any) => x.id === id);
                      if (!u) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-lg">
                          {u.name}
                          <button onClick={() => { const next = new Set(notifySelectedUsers); next.delete(id); setNotifySelectedUsers(next); }} className="hover:text-primary-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">通知标题 <span className="text-red-500">*</span></label>
              <input type="text" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="请输入通知标题"
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
              <div className="text-right text-xs text-gray-400 mt-1">{notifyTitle.length}/200</div>
            </div>

            {/* 内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">通知内容</label>
              <textarea value={notifyContent} onChange={(e) => setNotifyContent(e.target.value)}
                placeholder="可选，补充通知详细内容..."
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm resize-none" />
              <div className="text-right text-xs text-gray-400 mt-1">{notifyContent.length}/2000</div>
            </div>

            {/* 链接 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">跳转链接</label>
              <input type="text" value={notifyLink} onChange={(e) => setNotifyLink(e.target.value)}
                placeholder="例如 /competitions 或 https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            </div>

            {/* 发送按钮 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {notifyMode === 'all' ? '将向所有注册用户发送通知' : `将向 ${notifySelectedUsers.size} 名选定用户发送通知`}
              </p>
              <button
                onClick={async () => {
                  if (!notifyTitle.trim()) { setMessage('请输入通知标题'); return; }
                  if (notifyMode === 'users' && notifySelectedUsers.size === 0) { setMessage('请至少选择一名用户'); return; }
                  setNotifySending(true);
                  try {
                    const res = await fetch('/api/admin/notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        mode: notifyMode,
                        title: notifyTitle.trim(),
                        content: notifyContent.trim() || undefined,
                        link: notifyLink.trim() || undefined,
                        type: 'system',
                        userIds: notifyMode === 'users' ? Array.from(notifySelectedUsers) : undefined,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setMessage(data.error || '发送失败');
                    } else {
                      setMessage(`成功发送 ${data.count} 条通知`);
                      setNotifyTitle('');
                      setNotifyContent('');
                      setNotifyLink('');
                      setNotifySelectedUsers(new Set());
                    }
                  } catch {
                    setMessage('发送失败');
                  }
                  setNotifySending(false);
                }}
                disabled={notifySending}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition text-sm disabled:opacity-50"
              >
                {notifySending ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>发送中...</>
                ) : (
                  <><Send className="w-4 h-4" /> 发送通知</>
                )}
              </button>
            </div>
          </div>
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

      {/* ===== 总览 ===== */}
      {tab === 'dashboard' && <DashboardPanel onJump={(t: string) => setTab(t as any)} />}

      {/* ===== 赛题模板 ===== */}
      {tab === 'templates' && <TemplatesPanel onMessage={setMessage} onApply={(tpl) => {
        setEditingComp(null);
        setCompForm((prev: any) => ({
          ...prev,
          title: tpl.title,
          description: tpl.description,
          content: tpl.content,
        }));
        setShowForm(true);
        setTab('competitions');
      }} />}

      {/* ===== 浮动批量操作栏 ===== */}
      {tab === 'submissions' && selectedSubs.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 shadow-2xl rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2 max-w-[95vw]">
          <span className="text-sm font-medium text-gray-700 mr-2">已选 {selectedSubs.size} 项</span>
          <button
            onClick={() => setSelectedSubs(new Set())}
            className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
            disabled={batchBusy}
          >清空</button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            disabled={batchBusy}
            onClick={async () => {
              const s = prompt('批量打分：请输入分数（0-100）。留空取消。');
              if (!s || s.trim() === '') return;
              const score = Number(s);
              if (!isFinite(score) || score < 0 || score > 100) { alert('分数无效'); return; }
              const feedback = prompt('可选评语（留空跳过）：') || undefined;
              setBatchBusy(true);
              try {
                const res = await fetch('/api/submissions/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ids: Array.from(selectedSubs), action: 'grade', payload: { score, feedback } }),
                });
                const data = await res.json();
                if (res.ok) {
                  setMessage(`已批量评分 ${data.count} 条`);
                  setSelectedSubs(new Set());
                  await loadSubmissions();
                } else setMessage(data.error || '批量操作失败');
              } catch { setMessage('批量操作失败'); }
              setBatchBusy(false);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition"
          >批量评分</button>
          <select
            disabled={batchBusy}
            onChange={async (e) => {
              const v = e.target.value;
              if (!v) return;
              e.currentTarget.value = '';
              const award = v === 'none' ? null : v;
              if (!confirm(`确定将 ${selectedSubs.size} 条提交的奖项设置为：${award || '清除'}？`)) return;
              setBatchBusy(true);
              try {
                const res = await fetch('/api/submissions/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ids: Array.from(selectedSubs), action: 'award', payload: { award } }),
                });
                const data = await res.json();
                if (res.ok) {
                  setMessage(`已批量设置奖项 ${data.count} 条`);
                  setSelectedSubs(new Set());
                  await loadSubmissions();
                } else setMessage(data.error || '批量操作失败');
              } catch { setMessage('批量操作失败'); }
              setBatchBusy(false);
            }}
            className="px-2 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition"
            defaultValue=""
          >
            <option value="">批量授奖…</option>
            <option value="special">特等奖</option>
            <option value="first">一等奖</option>
            <option value="second">二等奖</option>
            <option value="third">三等奖</option>
            <option value="excellent">优秀奖</option>
            <option value="none">清除奖项</option>
          </select>
          <button
            disabled={batchBusy}
            onClick={async () => {
              if (!confirm(`确定批量公示 ${selectedSubs.size} 条？`)) return;
              setBatchBusy(true);
              try {
                const res = await fetch('/api/submissions/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ids: Array.from(selectedSubs), action: 'showcase', payload: { showcased: true } }),
                });
                const data = await res.json();
                if (res.ok) {
                  setMessage(`已公示 ${data.count} 条`);
                  setSelectedSubs(new Set());
                  await loadSubmissions();
                } else setMessage(data.error || '操作失败');
              } catch { setMessage('操作失败'); }
              setBatchBusy(false);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 transition"
          >批量公示</button>
          <button
            disabled={batchBusy}
            onClick={async () => {
              if (!confirm(`确定要删除 ${selectedSubs.size} 条提交？此操作不可逆`)) return;
              setBatchBusy(true);
              try {
                const res = await fetch('/api/submissions/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ids: Array.from(selectedSubs), action: 'delete' }),
                });
                const data = await res.json();
                if (res.ok) {
                  setMessage(`已删除 ${data.count} 条`);
                  setSelectedSubs(new Set());
                  await loadSubmissions();
                } else setMessage(data.error || '删除失败');
              } catch { setMessage('删除失败'); }
              setBatchBusy(false);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition"
          >批量删除</button>
        </div>
      )}
    </div>
  );
}

function CleanupPanel({ onMessage }: { onMessage: (m: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cleanup');
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const exec = async (target: string, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    setBusy(target);
    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (res.ok) {
        const extra = data.freedBytes ? ` (释放 ${formatFileSize(data.freedBytes)})` : '';
        onMessage(`清理成功：删除 ${data.deleted} 项${extra}`);
        load();
      } else {
        onMessage(data.error || '清理失败');
      }
    } catch {
      onMessage('清理失败');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-400 text-center py-10">加载失败</p>;
  }

  const cards = [
    {
      key: 'orphan_files',
      title: '孤立文件',
      desc: '扫描 public/uploads 目录，删除不再被任何赛题或提交引用的文件（可能由用户删除提交后遗留）',
      count: stats.orphanFiles.count,
      detail: `共 ${formatFileSize(stats.orphanFiles.totalSize)}`,
      btnLabel: '清理孤立文件',
      confirmMsg: `确认删除 ${stats.orphanFiles.count} 个孤立文件（${formatFileSize(stats.orphanFiles.totalSize)}）？此操作不可恢复。`,
      canRun: stats.orphanFiles.count > 0,
      color: 'amber',
    },
    {
      key: 'old_login_logs',
      title: '旧登录日志（30 天前）',
      desc: '删除 30 天前的登录日志记录。不影响账号锁定功能',
      count: stats.loginLogs.old,
      detail: `总共 ${stats.loginLogs.all} 条`,
      btnLabel: '清理旧日志',
      confirmMsg: `确认删除 ${stats.loginLogs.old} 条 30 天前的登录日志？`,
      canRun: stats.loginLogs.old > 0,
      color: 'blue',
    },
    {
      key: 'all_login_logs',
      title: '全部登录日志',
      desc: '⚠️ 清空所有登录日志，包括最近的。会临时解除所有账号锁定',
      count: stats.loginLogs.all,
      detail: '',
      btnLabel: '清空全部',
      confirmMsg: `⚠️ 确认清空全部 ${stats.loginLogs.all} 条登录日志？此操作会解除所有账号的锁定状态。`,
      canRun: stats.loginLogs.all > 0,
      color: 'red',
    },
    {
      key: 'old_read_notifications',
      title: '旧已读通知（30 天前）',
      desc: '删除 30 天前已读的系统通知',
      count: stats.notifications.oldRead,
      detail: `所有已读 ${stats.notifications.allRead} 条`,
      btnLabel: '清理旧通知',
      confirmMsg: `确认删除 ${stats.notifications.oldRead} 条 30 天前的已读通知？`,
      canRun: stats.notifications.oldRead > 0,
      color: 'blue',
    },
    {
      key: 'all_read_notifications',
      title: '所有已读通知',
      desc: '清空所有已读通知（未读通知保留）',
      count: stats.notifications.allRead,
      detail: '',
      btnLabel: '清空已读',
      confirmMsg: `确认删除全部 ${stats.notifications.allRead} 条已读通知？`,
      canRun: stats.notifications.allRead > 0,
      color: 'red',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">数据清理</h2>
          <p className="text-gray-400 text-sm mt-0.5">定期清理冗余数据，保持数据库与磁盘精简</p>
        </div>
        <button onClick={load}
          className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition">
          刷新统计
        </button>
      </div>

      {stats.orphanFiles.count > 0 && (
        <div className="mb-6 bg-white rounded-2xl border border-amber-200/60 overflow-hidden">
          <div className="px-5 py-3 bg-amber-50/50 border-b border-amber-100">
            <h3 className="text-sm font-semibold text-amber-700">孤立文件预览（最多显示 50 个）</h3>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <tbody>
                {stats.orphanFiles.files.map((f: any) => (
                  <tr key={f.name} className="border-t border-gray-50">
                    <td className="px-5 py-2 font-mono text-xs text-gray-600 truncate max-w-md">{f.name}</td>
                    <td className="px-5 py-2 text-right text-xs text-gray-400 whitespace-nowrap">{formatFileSize(f.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {cards.map((c) => {
          const colorMap: Record<string, string> = {
            amber: 'ring-amber-200/60 bg-amber-50/30',
            blue: 'ring-blue-200/60 bg-blue-50/20',
            red: 'ring-red-200/60 bg-red-50/20',
          };
          const btnColorMap: Record<string, string> = {
            amber: 'bg-amber-600 hover:bg-amber-700',
            blue: 'bg-blue-600 hover:bg-blue-700',
            red: 'bg-red-600 hover:bg-red-700',
          };
          return (
            <div key={c.key} className={`bg-white rounded-2xl p-5 ring-1 ${colorMap[c.color]}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{c.title}</h3>
                <span className="font-mono text-2xl font-bold text-gray-900 tabular-nums">{c.count}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{c.desc}</p>
              {c.detail && <p className="text-xs text-gray-400 mb-3">{c.detail}</p>}
              <button
                onClick={() => exec(c.key, c.confirmMsg)}
                disabled={!c.canRun || busy === c.key}
                className={`w-full px-3 py-2 text-xs font-semibold text-white rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${btnColorMap[c.color]}`}>
                {busy === c.key ? '清理中...' : c.btnLabel}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 leading-relaxed">
        💡 <b className="text-gray-700">建议：</b>每月执行一次"孤立文件"和"旧登录日志"清理。
        "清空全部" 类操作为应急选项，请谨慎使用。所有数据库操作都是即时且不可恢复的，建议清理前备份 <code className="px-1 py-0.5 bg-white rounded text-gray-700">prisma/dev.db</code>。
      </div>
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
            secondaryColor: data.secondaryColor || '',
            gradientEnabled: data.gradientEnabled || false,
            gradientAngle: typeof data.gradientAngle === 'number' ? data.gradientAngle : 160,
            logoUrl: data.logoUrl || '',
            bannerText: data.bannerText || '',
            bannerEnabled: data.bannerEnabled || false,
            maxFileSize: data.maxFileSize || 10,
            maxSubmissionVersions: data.maxSubmissionVersions || 5,
            commentsEnabled: data.commentsEnabled !== false,
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
        <h3 className="font-medium text-gray-900 border-b pb-3">主题配色</h3>

        {/* 实时预览 */}
        <div className="rounded-2xl h-28 shadow-inner relative overflow-hidden flex items-center justify-center"
          style={{ background: buildHeroGradient(form) }}>
          <div className="text-white font-semibold tracking-tight text-lg drop-shadow">配色预览</div>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        </div>

        {/* 渐变开关 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <div className="text-sm font-medium text-gray-900">启用渐变配色</div>
            <p className="text-xs text-gray-400 mt-0.5">关闭时使用单色，开启后可设置副色生成渐变</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.gradientEnabled}
              onChange={e => setForm({ ...form, gradientEnabled: e.target.checked })}
              className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* 渐变预设 */}
        {form.gradientEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">渐变预设</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {GRADIENT_PRESETS.map(g => {
                const isActive = form.primaryColor === g.primary && form.secondaryColor === g.secondary;
                return (
                  <button key={g.name} type="button"
                    onClick={() => setForm({ ...form, primaryColor: g.primary, secondaryColor: g.secondary, gradientEnabled: true })}
                    className={`relative rounded-xl h-14 overflow-hidden transition-all ${isActive ? 'ring-2 ring-offset-2 ring-gray-900' : 'hover:scale-[1.02]'}`}
                    style={{ background: `linear-gradient(${form.gradientAngle}deg, ${g.primary}, ${g.secondary})` }}>
                    <span className="absolute inset-x-0 bottom-0 text-[10px] text-white font-medium bg-black/25 py-1 text-center">{g.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 主色 + 副色 */}
        <div className={`grid gap-4 ${form.gradientEnabled ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主色</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-0" />
              <input type="text" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          {form.gradientEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">副色</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondaryColor || '#06b6d4'} onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0" />
                  <input type="text" value={form.secondaryColor || ''} onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                    placeholder="#06b6d4"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渐变角度 {form.gradientAngle}°</label>
                <input type="range" min="0" max="360" value={form.gradientAngle}
                  onChange={e => setForm({ ...form, gradientAngle: parseInt(e.target.value, 10) })}
                  className="w-full h-10 cursor-pointer accent-gray-900" />
              </div>
            </>
          )}
        </div>

        {/* 单色预设 */}
        {!form.gradientEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">单色预设</label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map(c => (
                <button key={c.value} type="button" onClick={() => setForm({ ...form, primaryColor: c.value })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm transition ${
                    form.primaryColor === c.value ? 'border-gray-900 bg-gray-50 font-medium' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: c.value }}></span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">重交版本上限（份/赛题/用户）</label>
          <div className="flex items-center gap-4">
            <input type="range" min="1" max="20" value={form.maxSubmissionVersions || 5}
              onChange={e => setForm({ ...form, maxSubmissionVersions: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            <div className="flex items-center gap-1">
              <input type="number" min="1" max="20" value={form.maxSubmissionVersions || 5}
                onChange={e => setForm({ ...form, maxSubmissionVersions: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) })}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center" />
              <span className="text-sm text-gray-500">份</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">用户截止前可重交，超出上限会自动删除最旧版本（含文件）。建议 3~10 份</p>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700">公示作品评论与点赞</label>
            <p className="text-xs text-gray-400 mt-0.5">关闭后公示页不再允许发表评论或点赞（已有记录仍可查看）</p>
          </div>
          <button type="button" onClick={() => setForm({ ...form, commentsEnabled: !form.commentsEnabled })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${form.commentsEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}
            aria-pressed={form.commentsEnabled}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${form.commentsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
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

// ============== 总览仪表盘 ==============
function DashboardPanel({ onJump }: { onJump: (t: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">加载中…</div>;
  if (!data) return <div className="text-center py-12 text-gray-400">暂无数据</div>;

  const maxDaily = Math.max(1, ...data.daily.map((d: any) => d.count));

  return (
    <div className="space-y-6">
      {/* 顶部 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard color="blue" icon={<Users className="w-5 h-5" />} label="用户总数" value={data.users.total} sub={`今日新增 ${data.users.today}`} onClick={() => onJump('users')} />
        <KpiCard color="emerald" icon={<FileText className="w-5 h-5" />} label="进行中赛题" value={data.competitions.active} sub={`草稿 ${data.competitions.draft} · 已结束 ${data.competitions.ended}`} onClick={() => onJump('competitions')} />
        <KpiCard color="amber" icon={<FileDown className="w-5 h-5" />} label="待评分" value={data.submissions.pending} sub={`总提交 ${data.submissions.total}`} highlight={data.submissions.pending > 0} onClick={() => onJump('submissions')} />
        <KpiCard color="purple" icon={<Activity className="w-5 h-5" />} label="今日提交" value={data.submissions.today} sub="最近 24 小时" />
      </div>

      {/* 最近 7 天柱状图（CSS 实现） */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" /> 最近 7 天提交
        </h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {data.daily.map((d: any) => {
            const h = (d.count / maxDaily) * 100;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="text-[10px] text-gray-400">{d.count > 0 ? d.count : ''}</div>
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md min-h-[2px] group-hover:from-blue-600 group-hover:to-blue-500 transition"
                  style={{ height: `${Math.max(2, h)}%` }}
                  title={`${d.date}: ${d.count} 份`}
                />
                <div className="text-[10px] text-gray-400">{d.date.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 待评分赛题排行 */}
      {data.pendingTop.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" /> 待评分赛题
          </h3>
          <div className="space-y-2">
            {data.pendingTop.map((p: any) => (
              <button
                key={p.competitionId}
                onClick={() => onJump('submissions')}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-amber-50/50 transition text-left"
              >
                <span className="font-medium text-gray-800 truncate">{p.title}</span>
                <span className="text-sm font-semibold text-amber-600 flex-shrink-0">{p.count} 份待评</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, highlight, onClick }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-white rounded-2xl border p-4 transition ${
        highlight ? 'border-amber-300 ring-2 ring-amber-200/50' : 'border-gray-200/80 hover:border-gray-300'
      } ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}>{icon}</div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </button>
  );
}

// ============== 赛题模板管理 ==============
function TemplatesPanel({ onMessage, onApply }: { onMessage: (m: string) => void; onApply: (tpl: any) => void }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', title: '', description: '', content: '', durationDays: 7 });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competition-templates', { cache: 'no-store' });
      if (res.ok) setList(await res.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing({ id: null });
    setForm({ name: '', title: '', description: '', content: '', durationDays: 7 });
  };
  const startEdit = (tpl: any) => {
    setEditing(tpl);
    setForm({
      name: tpl.name || '',
      title: tpl.title || '',
      description: tpl.description || '',
      content: tpl.content || '',
      durationDays: tpl.durationDays || 7,
    });
  };
  const save = async () => {
    if (!form.name.trim() || !form.title.trim()) {
      onMessage('模板名和默认标题必填');
      return;
    }
    const url = editing?.id ? `/api/competition-templates/${editing.id}` : '/api/competition-templates';
    const method = editing?.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      onMessage(editing?.id ? '模板已更新' : '模板已创建');
      setEditing(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      onMessage(d.error || '保存失败');
    }
  };
  const del = async (id: string) => {
    if (!confirm('确定删除该模板？')) return;
    const res = await fetch(`/api/competition-templates/${id}`, { method: 'DELETE' });
    if (res.ok) { onMessage('已删除'); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">赛题模板</h2>
          <p className="text-gray-400 text-sm mt-0.5">保存常用赛题结构，创建时一键应用以节省重复劳动</p>
        </div>
        <button onClick={startNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition">
          <Plus className="w-4 h-4" /> 新建模板
        </button>
      </div>

      {editing && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-medium text-gray-900">{editing.id ? '编辑模板' : '新建模板'}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">模板名（仅 admin 可见）</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">默认开放时长（天）</label>
              <input type="number" min={1} max={365} value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: Math.max(1, Math.min(365, parseInt(e.target.value) || 7)) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">默认赛题标题</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">默认简介</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">默认正文（Markdown）</label>
            <MarkdownEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} rows={10} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition">取消</button>
            <button onClick={save}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition inline-flex items-center gap-1">
              <Save className="w-4 h-4" /> 保存
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200/80">还没有模板，点击右上角创建一个</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((tpl: any) => (
            <div key={tpl.id} className="bg-white rounded-2xl border border-gray-200/80 p-4 hover:border-gray-300 transition">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-gray-900 truncate">{tpl.name}</h4>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{tpl.durationDays} 天</span>
              </div>
              <p className="text-sm text-gray-700 mt-2 truncate">{tpl.title}</p>
              {tpl.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{tpl.description}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <button onClick={() => onApply(tpl)}
                  className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">应用到新赛题</button>
                <button onClick={() => startEdit(tpl)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition inline-flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> 编辑
                </button>
                <button onClick={() => del(tpl.id)}
                  className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
