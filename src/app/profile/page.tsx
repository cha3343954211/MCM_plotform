'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Mail, Building2, CreditCard, Phone, Lock, Save, Shield, BarChart3, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { isAdminRole, roleLabel } from '@/lib/roles';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: '', school: '', studentId: '', phone: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile');
      return;
    }
    if (status === 'authenticated') {
      fetch('/api/auth/profile')
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => {
          setProfile(data);
          setForm({
            name: data.name || '',
            school: data.school || '',
            studentId: data.studentId || '',
            phone: data.phone || '',
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, router]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        showMsg('success', '资料已更新');
      } else {
        showMsg('error', data.error || '更新失败');
      }
    } catch {
      showMsg('error', '更新失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) {
      showMsg('error', '两次输入的新密码不一致');
      return;
    }
    if (pwd.newPassword.length < 6) {
      showMsg('error', '新密码长度至少 6 位');
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showMsg('success', '密码修改成功');
      } else {
        showMsg('error', data.error || '修改失败');
      }
    } catch {
      showMsg('error', '修改失败');
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-32 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">个人中心</h1>
        <p className="text-gray-400 text-sm mt-1">管理你的账户信息与密码</p>
      </div>

      {/* 入口：我的成绩 */}
      <Link href="/profile/stats"
        className="flex items-center justify-between gap-3 mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 hover:from-blue-100 hover:to-indigo-100 transition group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">我的成绩</div>
            <div className="text-xs text-gray-500">查看参赛记录、得分趋势、获奖墙，启用日历订阅</div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
      </Link>

      {message && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-700 ring-1 ring-green-200/60' : 'bg-red-50 text-red-700 ring-1 ring-red-200/60'
        }`}>
          {message.text}
        </div>
      )}

      {/* Account info card */}
      <div className="glass-card rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center text-white font-bold text-xl shadow-md">
            {profile.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{profile.name}</h2>
              {isAdminRole(profile.role) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-600 ring-1 ring-amber-200/50">
                  <Shield className="w-3 h-3" /> {roleLabel(profile.role)}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" />{profile.email}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">注册于 {formatDate(profile.createdAt)}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">基本资料</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Field icon={User} label="姓名" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field icon={Building2} label="学校" value={form.school} onChange={(v) => setForm({ ...form, school: v })} placeholder="例如：清华大学" />
            <Field icon={CreditCard} label="学号" value={form.studentId} onChange={(v) => setForm({ ...form, studentId: v })} placeholder="可选" />
            <Field icon={Phone} label="联系电话" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="可选" />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-2xl hover:bg-gray-800 transition-all duration-300 disabled:opacity-50">
              <Save className="w-4 h-4" />{savingProfile ? '保存中...' : '保存资料'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password card */}
      <div className="glass-card rounded-3xl p-6">
        <form onSubmit={handleChangePwd} className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">修改密码</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Field type="password" label="当前密码" value={pwd.currentPassword} onChange={(v) => setPwd({ ...pwd, currentPassword: v })} required />
            <Field type="password" label="新密码" value={pwd.newPassword} onChange={(v) => setPwd({ ...pwd, newPassword: v })} required placeholder="至少 6 位" />
            <Field type="password" label="确认新密码" value={pwd.confirmPassword} onChange={(v) => setPwd({ ...pwd, confirmPassword: v })} required />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingPwd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-2xl hover:bg-gray-800 transition-all duration-300 disabled:opacity-50">
              <Lock className="w-4 h-4" />{savingPwd ? '修改中...' : '修改密码'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, type = 'text', placeholder, required }: {
  icon?: any; label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          required={required} placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 text-sm bg-white/60 border border-gray-200/80 rounded-xl outline-none focus:border-gray-400 focus:bg-white transition-all`} />
      </div>
    </div>
  );
}
