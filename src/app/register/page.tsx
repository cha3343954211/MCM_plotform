'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User, Building2, CreditCard, Phone } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    school: '', studentId: '', phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (form.password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '注册失败');
      } else {
        router.push('/login?registered=true');
      }
    } catch {
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name', label: '姓名', type: 'text', icon: User, placeholder: '请输入姓名', required: true },
    { key: 'email', label: '邮箱', type: 'email', icon: Mail, placeholder: 'your@email.com', required: true },
    { key: 'password', label: '密码', type: 'password', icon: Lock, placeholder: '至少6位密码', required: true },
    { key: 'confirmPassword', label: '确认密码', type: 'password', icon: Lock, placeholder: '再次输入密码', required: true },
    { key: 'school', label: '学校', type: 'text', icon: Building2, placeholder: '选填', required: false },
    { key: 'studentId', label: '学号', type: 'text', icon: CreditCard, placeholder: '选填', required: false },
    { key: 'phone', label: '手机号', type: 'tel', icon: Phone, placeholder: '选填', required: false },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-6 h-6 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">注册账号</h1>
            <p className="text-gray-500 mt-1">创建你的竞赛平台账号</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {f.label} {!f.required && <span className="text-gray-400 font-normal">(选填)</span>}
                </label>
                <div className="relative">
                  <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={(e) => updateForm(f.key, e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition mt-2"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            已有账号？
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium ml-1">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
