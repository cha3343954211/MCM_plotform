'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Mail, Lock, User, Building2, CreditCard, Phone, UserPlus, ArrowRight } from 'lucide-react';
import { useSiteConfig } from '@/components/SiteConfigProvider';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#f5f5f7]"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function FloatingOrbs({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30 animate-orb" style={{ background: `radial-gradient(circle, ${color}66, transparent 70%)` }} />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 animate-orb" style={{ background: `radial-gradient(circle, ${color}44, transparent 70%)`, animationDelay: '-5s' }} />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-15 animate-orb" style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)`, animationDelay: '-10s' }} />
    </div>
  );
}

function MathFormulas() {
  const formulas = ['∫', 'Σ', 'π', '∞', 'Δ', '√', 'λ', 'θ', 'α', 'β', '∂', 'φ'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {formulas.map((f, i) => (
        <span
          key={i}
          className="absolute text-white/[0.04] font-serif select-none animate-float"
          style={{
            left: `${(i * 8.5) % 100}%`,
            top: `${(i * 13 + 5) % 90}%`,
            fontSize: `${28 + (i % 4) * 12}px`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${8 + (i % 3) * 3}s`,
          }}
        >
          {f}
        </span>
      ))}
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(searchParams.get('registered') ? 'login' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(searchParams.get('registered') ? '注册成功，请登录' : '');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { config } = useSiteConfig();
  const [regForm, setRegForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    school: '', studentId: '', phone: '',
  });

  useEffect(() => { setMounted(true); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) { setError(res.error); }
      else { router.push('/competitions'); router.refresh(); }
    } catch { setError('登录失败，请稍后重试'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (regForm.password !== regForm.confirmPassword) { setError('两次密码不一致'); setLoading(false); return; }
    if (regForm.password.length < 6) { setError('密码至少6位'); setLoading(false); return; }
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '注册失败'); }
      else { setSuccess('注册成功！请登录'); setMode('login'); setEmail(regForm.email); }
    } catch { setError('注册失败'); }
    finally { setLoading(false); }
  };

  const switchMode = (m: 'login' | 'register') => {
    setError(''); setSuccess(''); setMode(m);
  };

  const regFields = [
    { key: 'name', label: '姓名', type: 'text', icon: User, placeholder: '请输入姓名', required: true },
    { key: 'email', label: '邮箱', type: 'email', icon: Mail, placeholder: 'your@email.com', required: true },
    { key: 'password', label: '密码', type: 'password', icon: Lock, placeholder: '至少6位密码', required: true },
    { key: 'confirmPassword', label: '确认密码', type: 'password', icon: Lock, placeholder: '再次输入密码', required: true },
    { key: 'school', label: '学校', type: 'text', icon: Building2, placeholder: '选填', required: false },
    { key: 'studentId', label: '学号', type: 'text', icon: CreditCard, placeholder: '选填', required: false },
    { key: 'phone', label: '手机号', type: 'tel', icon: Phone, placeholder: '选填', required: false },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex relative overflow-hidden">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-[45%] relative items-center justify-center"
        style={{ background: `linear-gradient(160deg, ${config.primaryColor}ee, ${config.primaryColor}bb, ${config.primaryColor}88)` }}
      >
        <FloatingOrbs color={config.primaryColor} />
        <MathFormulas />
        <div className={`relative z-10 text-center text-white px-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="w-20 h-20 rounded-3xl glass-dark flex items-center justify-center mx-auto mb-8 text-4xl font-serif shadow-2xl">
            ∑
          </div>
          <h2 className="text-4xl font-bold mb-4 tracking-tight">{config.siteName}</h2>
          <p className="text-lg text-white/70 leading-relaxed max-w-sm mx-auto">
            {config.heroDesc}
          </p>
          <div className="mt-12 flex justify-center gap-10 text-white/50">
            {[
              { sym: '∫', label: '赛题发布' },
              { sym: 'π', label: '论文提交' },
              { sym: 'Σ', label: '成绩查询' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 transition-all duration-500" style={{ animationDelay: `${i * 200}ms` }}>
                <span className="text-3xl font-serif text-white/80">{item.sym}</span>
                <span className="text-xs tracking-wider">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 py-6 sm:py-12 bg-[#f5f5f7] relative overflow-y-auto touch-scroll">
        <div className={`w-full max-w-md transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-white/60 backdrop-blur-xl rounded-2xl mb-6 sm:mb-8 shadow-sm border border-white/40 sticky top-0 z-10">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-500 ${
                mode === 'login'
                  ? 'bg-white shadow-md text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-500 ${
                mode === 'register'
                  ? 'bg-white shadow-md text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              注册
            </button>
          </div>

          {/* Card */}
          <div className="glass-card rounded-3xl p-5 sm:p-8 shadow-xl">
            {/* ─ Login Form ─ */}
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mode === 'login' ? 'opacity-100 translate-x-0 h-auto' : 'opacity-0 -translate-x-8 h-0 overflow-hidden pointer-events-none'
            }`}>
              <div className="text-center mb-6 sm:mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg apple-btn"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}
                >
                  <LogIn className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">欢迎回来</h1>
                <p className="text-gray-400 mt-1 text-sm">登录你的{config.siteName}账号</p>
              </div>

              {error && mode === 'login' && (
                <div className="mb-5 p-3 bg-red-50/80 backdrop-blur border border-red-200/50 text-red-600 rounded-2xl text-sm animate-shake">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-5 p-3 bg-green-50/80 backdrop-blur border border-green-200/50 text-green-600 rounded-2xl text-sm animate-fade-in">
                  {success}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">邮箱</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary-500 transition-colors duration-300" />
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-input text-sm" placeholder="your@email.com" required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">密码</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary-500 transition-colors duration-300" />
                    <input
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-input text-sm" placeholder="输入密码" required
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 text-white font-semibold rounded-2xl disabled:opacity-50 apple-btn flex items-center justify-center gap-2 text-sm"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}dd)` }}
                >
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>登录中...</>
                  ) : (<>登录 <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <p className="mt-5 sm:mt-6 text-center text-sm text-gray-400">
                还没有账号？
                <button onClick={() => switchMode('register')} className="font-semibold ml-1 transition-colors" style={{ color: config.primaryColor }}>
                  立即注册
                </button>
              </p>
            </div>

            {/* ─ Register Form ─ */}
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mode === 'register' ? 'opacity-100 translate-x-0 h-auto' : 'opacity-0 translate-x-8 h-0 overflow-hidden pointer-events-none'
            }`}>
              <div className="text-center mb-5 sm:mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg apple-btn"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}
                >
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">创建账号</h1>
                <p className="text-gray-400 mt-1 text-sm">加入{config.siteName}</p>
              </div>

              {error && mode === 'register' && (
                <div className="mb-4 p-3 bg-red-50/80 backdrop-blur border border-red-200/50 text-red-600 rounded-2xl text-sm animate-shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3">
                {regFields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                      {f.label} {!f.required && <span className="text-gray-300 font-normal normal-case">(选填)</span>}
                    </label>
                    <div className="relative group">
                      <f.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary-500 transition-colors duration-300" />
                      <input
                        type={f.type}
                        value={(regForm as any)[f.key]}
                        onChange={(e) => setRegForm({ ...regForm, [f.key]: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl apple-input text-sm"
                        placeholder={f.placeholder} required={f.required}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 text-white font-semibold rounded-2xl disabled:opacity-50 apple-btn flex items-center justify-center gap-2 text-sm mt-2"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}dd)` }}
                >
                  {loading ? '注册中...' : (<>注册 <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-400">
                已有账号？
                <button onClick={() => switchMode('login')} className="font-semibold ml-1 transition-colors" style={{ color: config.primaryColor }}>
                  立即登录
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
