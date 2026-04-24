'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Menu, X, BookOpen, User, LogOut, Shield, Trophy } from 'lucide-react';
import { useSiteConfig } from './SiteConfigProvider';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { config } = useSiteConfig();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [
    { href: '/competitions', label: '赛题列表', show: true },
    { href: '/showcase', label: '论文公示', show: true, icon: Trophy },
    { href: '/my-submissions', label: '我的提交', show: !!session },
    { href: '/admin', label: '管理后台', show: session?.user?.role === 'admin', icon: Shield },
  ].filter(n => n.show);

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'glass shadow-sm' : 'bg-white/50 backdrop-blur-xl'}`}
      style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight hover:opacity-80 transition-opacity" style={{ color: config.primaryColor }}>
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}bb)` }}>
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="text-[17px]">{config.siteName}</span>
            </Link>
            <div className="hidden md:flex ml-8 gap-0.5">
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href}
                  className="px-3.5 py-1.5 rounded-xl text-[13px] font-medium text-gray-500 hover:text-gray-900 hover:bg-black/[0.04] transition-all duration-300">
                  <span className="flex items-center gap-1">
                    {item.icon && <item.icon className="w-3.5 h-3.5" />}
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <>
                <NotificationBell />
                <Link href="/profile"
                  className="text-[13px] text-gray-500 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] transition-all duration-300">
                  <User className="w-3.5 h-3.5" />
                  {session.user.name}
                  {session.user.role === 'admin' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md" style={{ background: `${config.primaryColor}15`, color: config.primaryColor }}>管理员</span>
                  )}
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50/50 transition-all duration-300">
                  <LogOut className="w-3.5 h-3.5" />退出
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-all duration-300">登录</Link>
                <Link href="/login" className="px-4 py-1.5 text-[13px] font-semibold text-white rounded-xl apple-btn"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}>注册</Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-xl text-gray-500 hover:bg-black/[0.04] transition-all duration-300">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 py-3 space-y-1 glass border-t border-white/10">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="block px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-black/[0.04] transition-all" onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          {session ? (
            <>
              <Link href="/profile" onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-black/[0.04] transition-all">
                个人中心
              </Link>
              <button onClick={() => { signOut({ callbackUrl: '/' }); setMenuOpen(false); }}
                className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50/50 transition-all">
                退出登录
              </button>
            </>
          ) : (
            <Link href="/login" className="block px-3 py-2.5 rounded-xl text-sm font-medium text-center text-white"
              style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }} onClick={() => setMenuOpen(false)}>
              登录 / 注册
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
