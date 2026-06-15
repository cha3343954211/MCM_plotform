'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Mail, Lock, User, Building2, CreditCard, Phone, UserPlus, ArrowRight } from 'lucide-react';
import { useSiteConfig } from '@/components/SiteConfigProvider';
import { buildHeroGradient } from '@/lib/utils';
import katex from 'katex';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#f5f5f7]"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function FloatingOrbs({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-25 animate-orb" style={{ background: `radial-gradient(circle, ${color}33, transparent 70%)` }} />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-15 animate-orb" style={{ background: `radial-gradient(circle, ${color}22, transparent 70%)`, animationDelay: '-5s' }} />
    </div>
  );
}

// Full-screen Dynamic Math Constellation Canvas Background (Dual-Color Adaptive)
function MathConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Math symbols
    const symbols = ['∫', 'Σ', 'π', '∞', 'Δ', '√', 'λ', 'θ', 'α', 'β', '∂', 'φ', 'f(x)', 'y=mx+b', 'dx', 'dy/dx', 'e^{i\\pi}', 'E=mc^2'];
    
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      symbol: string;
      size: number;
    }

    const nodes: Node[] = [];
    const nodeCount = 32;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        size: 13 + Math.random() * 15,
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Check if left brand panel is visible (large screens)
      const isLeftPanelVisible = window.innerWidth >= 1024;
      const leftBoundary = width * 0.42; // Left panel is 42% wide on large screens

      // Draw connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const alpha = (1 - dist / 100) * 0.08;
            
            // Choose link color based on position
            const useWhiteStyle = isLeftPanelVisible && n1.x < leftBoundary;
            if (useWhiteStyle) {
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            } else {
              ctx.strokeStyle = `rgba(15, 23, 42, ${alpha * 1.3})`; // dark slate lines on light grey side
            }
            
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      // Update and draw nodes
      nodes.forEach((node) => {
        if (mouseX > 0 && mouseY > 0) {
          const dx = mouseX - node.x;
          const dy = mouseY - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            node.vx += (dx / dist) * 0.007;
            node.vy += (dy / dist) * 0.007;
          }
        }

        // speed limit
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        const maxSpeed = 0.7;
        if (speed > maxSpeed) {
          node.vx = (node.vx / speed) * maxSpeed;
          node.vy = (node.vy / speed) * maxSpeed;
        }

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 15 || node.x > width - 15) node.vx *= -1;
        if (node.y < 15 || node.y > height - 15) node.vy *= -1;
        node.x = Math.max(15, Math.min(width - 15, node.x));
        node.y = Math.max(15, Math.min(height - 15, node.y));

        // Choose text color based on position
        const useWhiteStyle = isLeftPanelVisible && node.x < leftBoundary;
        if (useWhiteStyle) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        } else {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.065)'; // dark slate text on light side
        }
        
        ctx.font = `${node.size}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.symbol, node.x, node.y);
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none z-0" />;
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
  
  // Track focused field for micro-interactions
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    <div className="min-h-[calc(100vh-4rem)] flex relative overflow-hidden bg-[#f5f5f7] text-slate-800 select-none">
      
      {/* Full screen constellation canvas behind everything */}
      <MathConstellationCanvas />

      {/* Left brand panel (visible on large screens, matches site hero gradient) */}
      <div
        className="hidden lg:flex lg:w-[42%] relative items-center justify-center overflow-hidden border-r border-black/[0.04] z-10"
        style={{ background: buildHeroGradient(config) }}
      >
        <FloatingOrbs color="#ffffff" />
        
        <div className={`relative z-10 text-center text-white px-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="w-20 h-20 rounded-3xl glass-dark flex items-center justify-center mx-auto mb-8 text-4xl font-serif shadow-2xl animate-float border border-white/10">
            ∑
          </div>
          <h2 className="text-4xl font-bold mb-4 tracking-tight">{config.siteName}</h2>
          <p className="text-sm text-white/80 leading-relaxed max-w-sm mx-auto">
            {config.heroDesc}
          </p>
          <div className="mt-12 flex justify-center gap-10 text-white/50">
            {[
              { sym: '∫', label: '赛题发布' },
              { sym: 'π', label: '论文提交' },
              { sym: 'Σ', label: '成绩查询' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 transition-all duration-500" style={{ animationDelay: `${i * 200}ms` }}>
                <span className="text-3xl font-serif text-white/85">{item.sym}</span>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-white/80">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel (takes full screen on mobile) */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-y-auto touch-scroll z-10">
        <div className={`w-full max-w-[420px] transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-white/60 backdrop-blur-xl rounded-2xl mb-6 sm:mb-8 shadow-sm border border-white/45 sticky top-0 z-20">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                mode === 'login'
                  ? 'bg-white shadow-md text-gray-900 scale-[1.01]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                mode === 'register'
                  ? 'bg-white shadow-md text-gray-900 scale-[1.01]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              注册
            </button>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-[32px] p-5 sm:p-8 shadow-2xl border border-white/40 overflow-hidden relative">
            
            {/* ─ Login Form ─ */}
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mode === 'login' ? 'opacity-100 translate-x-0 scale-100 h-auto' : 'opacity-0 -translate-x-12 scale-95 h-0 overflow-hidden pointer-events-none'
            }`}>
              <div className="text-center mb-6 sm:mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white apple-btn"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}
                >
                  <LogIn className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">欢迎回来</h1>
                <p className="text-gray-400 mt-1 text-xs sm:text-sm">登录你的{config.siteName}账号</p>
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
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">邮箱</label>
                  <div className="relative group">
                    <Mail 
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300"
                      style={{ 
                        color: focusedField === 'login_email' ? config.primaryColor : '#9ca3af',
                        transform: `translateY(-50%) ${focusedField === 'login_email' ? 'scale(1.15)' : 'scale(1)'}`
                      }}
                    />
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('login_email')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-input text-sm border border-gray-200 bg-white/70 backdrop-blur-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none text-slate-800 placeholder-slate-400" 
                      placeholder="your@email.com" required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">密码</label>
                  <div className="relative group">
                    <Lock 
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300"
                      style={{ 
                        color: focusedField === 'login_password' ? config.primaryColor : '#9ca3af',
                        transform: `translateY(-50%) ${focusedField === 'login_password' ? 'scale(1.15)' : 'scale(1)'}`
                      }}
                    />
                    <input
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('login_password')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-input text-sm border border-gray-200 bg-white/70 backdrop-blur-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none text-slate-800 placeholder-slate-400" 
                      placeholder="输入密码" required
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 text-white font-semibold rounded-2xl disabled:opacity-50 apple-btn flex items-center justify-center gap-2 text-sm animate-gradient shadow-lg shadow-blue-500/10"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor || config.primaryColor + 'dd'})` }}
                >
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>登录中...</>
                  ) : (<>登录 <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-gray-400">
                还没有账号？
                <button onClick={() => switchMode('register')} className="font-semibold ml-1 transition-colors hover:underline" style={{ color: config.primaryColor }}>
                  立即注册
                </button>
              </p>
            </div>

            {/* ─ Register Form ─ */}
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mode === 'register' ? 'opacity-100 translate-x-0 scale-100 h-auto' : 'opacity-0 translate-x-12 scale-95 h-0 overflow-hidden pointer-events-none'
            }`}>
              <div className="text-center mb-5 sm:mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white apple-btn"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}
                >
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">创建账号</h1>
                <p className="text-gray-400 mt-1 text-xs sm:text-sm">加入{config.siteName}</p>
              </div>

              {error && mode === 'register' && (
                <div className="mb-4 p-3 bg-red-50/80 backdrop-blur border border-red-200/50 text-red-600 rounded-2xl text-sm animate-shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3">
                {regFields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                      {f.label} {!f.required && <span className="text-gray-350 font-normal normal-case">(选填)</span>}
                    </label>
                    <div className="relative group">
                      <f.icon 
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300"
                        style={{ 
                          color: focusedField === `reg_${f.key}` ? config.primaryColor : '#9ca3af',
                          transform: `translateY(-50%) ${focusedField === `reg_${f.key}` ? 'scale(1.15)' : 'scale(1)'}`
                        }}
                      />
                      <input
                        type={f.type}
                        value={(regForm as any)[f.key]}
                        onChange={(e) => setRegForm({ ...regForm, [f.key]: e.target.value })}
                        onFocus={() => setFocusedField(`reg_${f.key}`)}
                        onBlur={() => setFocusedField(null)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl apple-input text-sm border border-gray-200 bg-white/70 backdrop-blur-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none text-slate-800 placeholder-slate-450"
                        placeholder={f.placeholder} required={f.required}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 text-white font-semibold rounded-2xl disabled:opacity-50 apple-btn flex items-center justify-center gap-2 text-sm mt-2 animate-gradient shadow-lg shadow-blue-500/10"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor || config.primaryColor + 'dd'})` }}
                >
                  {loading ? '注册中...' : (<>注册 <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <p className="mt-5 text-center text-xs sm:text-sm text-gray-400">
                已有账号？
                <button onClick={() => switchMode('login')} className="font-semibold ml-1 transition-colors hover:underline" style={{ color: config.primaryColor }}>
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
