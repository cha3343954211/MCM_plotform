'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Upload, Award, Users, ArrowRight } from 'lucide-react';
import AnnouncementList from '@/components/AnnouncementList';
import { useSiteConfig } from '@/components/SiteConfigProvider';
import { buildHeroGradient } from '@/lib/utils';

export default function HomePage() {
  const { config } = useSiteConfig();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="bg-[#f5f5f7]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: buildHeroGradient(config) }}>
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 animate-orb" style={{ background: `radial-gradient(circle, white, transparent 70%)` }} />
          <div className="absolute -bottom-60 -left-40 w-[700px] h-[700px] rounded-full opacity-10 animate-orb" style={{ background: `radial-gradient(circle, white, transparent 70%)`, animationDelay: '-7s' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-44">
          <div className={`text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-dark rounded-full text-sm text-white/90 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              平台已上线
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-white">
              {config.heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed">
              {config.heroDesc}
            </p>
            <div className="flex justify-center">
              <Link href="/competitions"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-2xl bg-white/95 backdrop-blur apple-btn"
                style={{ color: config.primaryColor }}>
                查看赛题 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 60h1440V30C1200 0 240 0 0 30v30z" fill="#f5f5f7"/></svg>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className={`text-center mb-16 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">平台功能</h2>
          <p className="text-gray-400 max-w-xl mx-auto">一站式数学建模竞赛管理，从赛题发布到成绩查询全流程覆盖</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
          {[
            { icon: BookOpen, title: '赛题发布', desc: '管理员发布竞赛题目，参赛者在线查看赛题详情' },
            { icon: Upload, title: '论文提交', desc: '参赛团队在线提交解题论文，支持多种文件格式' },
            { icon: Award, title: '成绩查询', desc: '评审结束后，参赛者可在线查看评分和评语' },
            { icon: Users, title: '团队协作', desc: '支持团队信息登记，方便管理参赛队伍信息' },
          ].map((item, i) => (
            <div key={i} className="glass-card rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group cursor-default">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${config.primaryColor}18, ${config.primaryColor}08)` }}>
                <item.icon className="w-6 h-6" style={{ color: config.primaryColor }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <AnnouncementList />

      {/* ── Footer ── */}
      <footer className="glass border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} {config.footerText} · All rights reserved
        </div>
      </footer>
    </div>
  );
}
