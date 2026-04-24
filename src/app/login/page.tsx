'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useSiteConfig } from '@/components/SiteConfigProvider';

function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 1,
        o: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();
      }
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function MathFormulas() {
  const formulas = ['∫', 'Σ', 'π', '∞', 'Δ', '√', 'λ', 'θ', 'α', 'β', '∂', 'φ', 'ε', 'μ', 'ω'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {formulas.map((f, i) => (
        <span
          key={i}
          className="absolute text-white/[0.06] font-serif select-none animate-float"
          style={{
            left: `${(i * 7) % 100}%`,
            top: `${(i * 13 + 5) % 100}%`,
            fontSize: `${Math.random() * 40 + 20}px`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${6 + Math.random() * 6}s`,
          }}
        >
          {f}
        </span>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { config } = useSiteConfig();

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push('/competitions');
        router.refresh();
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex relative overflow-hidden">
      {/* Left animated panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}dd, ${config.primaryColor}88)` }}
      >
        <FloatingParticles />
        <MathFormulas />
        <div className={`relative z-10 text-center text-white px-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-7xl mb-6 font-serif">∑</div>
          <h2 className="text-3xl font-bold mb-4">{config.siteName}</h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-md">
            {config.heroDesc}
          </p>
          <div className="mt-8 flex justify-center gap-6 text-white/60 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-white/90">∫</span>
              <span>赛题发布</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-white/90">π</span>
              <span>论文提交</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-white/90">Σ</span>
              <span>成绩查询</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className={`w-full max-w-md transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}
              >
                <LogIn className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">登录账号</h1>
              <p className="text-gray-500 mt-1">欢迎回到{config.siteName}</p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition bg-gray-50/50 focus:bg-white"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition bg-gray-50/50 focus:bg-white"
                    placeholder="输入密码"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-lg active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}dd)` }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    登录中...
                  </span>
                ) : '登录'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              还没有账号？
              <Link href="/register" className="font-medium ml-1 hover:underline" style={{ color: config.primaryColor }}>
                立即注册
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
