'use client';

import Link from 'next/link';
import { BookOpen, Users, Upload, Award, Bell, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';
import { useSiteConfig } from '@/components/SiteConfigProvider';

const sections = [
  {
    title: '1. 注册与完善资料',
    icon: ShieldCheck,
    items: ['使用邮箱注册并登录平台。', '进入个人中心补充学校、学号、手机号等资料。', '忘记密码或资料异常时联系管理员处理。'],
  },
  {
    title: '2. 查看赛题与附件',
    icon: BookOpen,
    items: ['在赛题列表查看当前开放、草稿或已结束赛题。', '进入赛题详情阅读说明、时间安排和附件。', '注意开始时间与截止时间，截止后无法继续提交。'],
  },
  {
    title: '3. 创建或加入团队',
    icon: Users,
    items: ['进入我的团队创建团队，团队人数上限由管理员在赛题中统一设置。', '可复制邀请码邀请队友，也可在赛题详情页申请加入已有团队。', '队长可审核入队申请、移除成员、转让队长或解散团队。'],
  },
  {
    title: '4. 提交论文与附件',
    icon: Upload,
    items: ['在赛题详情页点击提交论文。', '选择个人提交或绑定自己的参赛团队。', '上传主文件和可选附件，填写版本说明后确认提交。', '重新提交会自动归档旧版本，平台仅展示最新有效版本。'],
  },
  {
    title: '5. 查看成绩与证书',
    icon: Award,
    items: ['进入我的提交查看状态、成绩、评语和获奖信息。', '团队页可查看团队相关提交和下载文件。', '获奖后可在我的提交中打印或保存证书。'],
  },
  {
    title: '6. 通知与常见问题',
    icon: Bell,
    items: ['站内通知会提示提交、团队申请、审核结果等事件。', '无法提交时请检查登录状态、赛题状态、截止时间和文件大小。', '无法加入团队时请确认未加入同一赛题下的其他团队。'],
  },
];

export default function UserGuidePage() {
  const { config } = useSiteConfig();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-8 md:p-10 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${config.primaryColor}12` }}>
            <HelpCircle className="w-6 h-6" style={{ color: config.primaryColor }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">用户端使用说明</h1>
            <p className="text-sm text-gray-400 mt-1">从注册、组队、提交到查看成绩的完整操作指南</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          <Link href="/competitions" className="inline-flex items-center gap-1 px-4 py-2 rounded-2xl text-sm font-medium text-white apple-btn" style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}cc)` }}>
            查看赛题 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/teams" className="inline-flex items-center gap-1 px-4 py-2 rounded-2xl text-sm font-medium bg-black/[0.04] text-gray-600 hover:bg-black/[0.06]">
            我的团队
          </Link>
          <Link href="/my-submissions" className="inline-flex items-center gap-1 px-4 py-2 rounded-2xl text-sm font-medium bg-black/[0.04] text-gray-600 hover:bg-black/[0.06]">
            我的提交
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div key={section.title} className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <section.icon className="w-5 h-5" style={{ color: config.primaryColor }} />
              <h2 className="font-semibold text-gray-900">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-500 leading-6">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: config.primaryColor }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
