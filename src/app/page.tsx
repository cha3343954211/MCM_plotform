'use client';

import Link from 'next/link';
import { BookOpen, Upload, Award, Users } from 'lucide-react';
import AnnouncementList from '@/components/AnnouncementList';
import { useSiteConfig } from '@/components/SiteConfigProvider';

export default function HomePage() {
  const { config } = useSiteConfig();

  return (
    <div>
      <section className="relative text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc, ${config.primaryColor}99)` }}>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZWMzRoLTRWMjhoNHYtNmg2djZoNHY2aC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-36">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 mb-6 border border-white/10">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              平台已上线
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in-up">
              {config.heroTitle}
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-10">
              {config.heroDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/competitions"
                className="inline-flex items-center justify-center px-8 py-3.5 text-lg font-semibold rounded-xl bg-white hover:bg-gray-100 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                style={{ color: config.primaryColor }}
              >
                查看赛题
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3.5 text-lg font-semibold rounded-xl text-white transition border border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
              >
                立即注册
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">平台功能</h2>
        <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">一站式数学建模竞赛管理，从赛题发布到成绩查询全流程覆盖</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: BookOpen, title: '赛题发布', desc: '管理员发布竞赛题目，参赛者在线查看赛题详情' },
            { icon: Upload, title: '论文提交', desc: '参赛团队在线提交解题论文，支持多种文件格式' },
            { icon: Award, title: '成绩查询', desc: '评审结束后，参赛者可在线查看评分和评语' },
            { icon: Users, title: '团队协作', desc: '支持团队信息登记，方便管理参赛队伍信息' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors"
                style={{ backgroundColor: `${config.primaryColor}10` }}
              >
                <item.icon className="w-6 h-6" style={{ color: config.primaryColor }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <AnnouncementList />

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {config.footerText} · All rights reserved
        </div>
      </footer>
    </div>
  );
}
