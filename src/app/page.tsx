'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { BookOpen, Upload, Award, Users, ArrowRight } from 'lucide-react';
import AnnouncementList from '@/components/AnnouncementList';
import MathDecoration from '@/components/MathDecoration';
import { useSiteConfig } from '@/components/SiteConfigProvider';
import { buildHeroGradient } from '@/lib/utils';
import katex from 'katex';

function FloatingFormula({ formula }: { formula: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(formula, ref.current, { throwOnError: false, displayMode: false });
      } catch (err) {
        console.error(err);
      }
    }
  }, [formula]);
  return <div ref={ref} />;
}

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

        {/* Floating formulas background watermark */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-[0.03] sm:opacity-[0.05] md:opacity-[0.07]">
          <div className="absolute top-[12%] left-[8%] text-white text-base sm:text-lg md:text-2xl font-mono animate-float" style={{ animationDelay: '0s', animationDuration: '14s' }}>
            <FloatingFormula formula="e^{i\pi} + 1 = 0" />
          </div>
          <div className="absolute bottom-[22%] left-[20%] text-white text-base sm:text-lg md:text-2xl font-mono animate-float" style={{ animationDelay: '-4s', animationDuration: '18s' }}>
            <FloatingFormula formula="\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}" />
          </div>
          <div className="absolute top-[32%] right-[45%] text-white text-base sm:text-lg md:text-2xl font-mono animate-float" style={{ animationDelay: '-8s', animationDuration: '22s' }}>
            <FloatingFormula formula="\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 md:py-36">
          <div className="grid md:grid-cols-12 gap-10 items-center">
            
            {/* Left Info Column */}
            <div className={`md:col-span-7 text-center md:text-left transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="inline-flex max-w-full items-center gap-2 px-4 py-2 glass-dark rounded-full text-xs sm:text-sm text-white/90 mb-6 sm:mb-8">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                平台已上线
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 sm:mb-6 text-white leading-tight">
                {config.heroTitle}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/75 mb-8 sm:mb-12 leading-relaxed max-w-xl">
                {config.heroDesc}
              </p>
              <div className="flex justify-center md:justify-start">
                <Link href="/competitions"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 sm:px-8 py-3.5 text-sm sm:text-base font-semibold rounded-2xl bg-white/95 backdrop-blur apple-btn max-w-xs"
                  style={{ color: config.primaryColor }}>
                  查看赛题 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Decoration Column */}
            <div className={`md:col-span-5 flex justify-center md:justify-end transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <MathDecoration />
            </div>

          </div>
        </div>
        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 60h1440V30C1200 0 240 0 0 30v30z" fill="#f5f5f7"/></svg>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24">
        <div className={`text-center mb-10 sm:mb-16 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3 sm:mb-4">平台功能</h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">一站式数学建模竞赛管理，从赛题发布到成绩查询全流程覆盖</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 stagger-children">
          {[
            { icon: BookOpen, title: '赛题发布', desc: '管理员发布竞赛题目，参赛者在线查看赛题详情' },
            { icon: Upload, title: '论文提交', desc: '参赛团队在线提交解题论文，支持多种文件格式' },
            { icon: Award, title: '成绩查询', desc: '评审结束后，参赛者可在线查看评分和评语' },
            { icon: Users, title: '团队协作', desc: '支持团队信息登记，方便管理参赛队伍信息' },
          ].map((item, i) => (
            <div key={i} className="glass-card rounded-3xl p-5 sm:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group cursor-default">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 transition-transform duration-500 group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${config.primaryColor}18, ${config.primaryColor}08)` }}>
                <item.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: config.primaryColor }} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 tracking-tight">{item.title}</h3>
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
