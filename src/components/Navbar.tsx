'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X, BookOpen, User, LogOut, Shield } from 'lucide-react';
import { useSiteConfig } from './SiteConfigProvider';

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { config } = useSiteConfig();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ color: config.primaryColor }}>
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="logo" className="w-7 h-7 rounded object-cover" />
              ) : (
                <BookOpen className="w-6 h-6" />
              )}
              {config.siteName}
            </Link>
            <div className="hidden md:flex ml-10 space-x-1">
              <Link href="/competitions" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition">
                赛题列表
              </Link>
              {session && (
                <Link href="/my-submissions" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition">
                  我的提交
                </Link>
              )}
              {session?.user?.role === 'admin' && (
                <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition">
                  <span className="flex items-center gap-1"><Shield className="w-4 h-4" />管理后台</span>
                </Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {session ? (
              <>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {session.user.name}
                  {session.user.role === 'admin' && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded">管理员</span>
                  )}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition"
                >
                  <LogOut className="w-4 h-4" />退出
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition">
                  登录
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                  注册
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-500">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-2">
            <Link href="/competitions" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
              赛题列表
            </Link>
            {session && (
              <Link href="/my-submissions" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                我的提交
              </Link>
            )}
            {session?.user?.role === 'admin' && (
              <Link href="/admin" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                管理后台
              </Link>
            )}
            {session ? (
              <button
                onClick={() => { signOut({ callbackUrl: '/' }); setMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-md text-sm text-red-600 hover:bg-gray-50"
              >
                退出登录
              </button>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  登录
                </Link>
                <Link href="/register" className="block px-3 py-2 rounded-md text-sm text-white bg-primary-600 text-center hover:bg-primary-700" onClick={() => setMenuOpen(false)}>
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
