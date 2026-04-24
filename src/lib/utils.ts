import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    active: '进行中',
    ended: '已结束',
    pending: '待评审',
    graded: '已评分',
  };
  return map[status] || status;
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    ended: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    graded: 'bg-blue-100 text-blue-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export const AWARD_OPTIONS = [
  { value: '', label: '无奖项' },
  { value: 'special', label: '特等奖' },
  { value: 'first', label: '一等奖' },
  { value: 'second', label: '二等奖' },
  { value: 'third', label: '三等奖' },
  { value: 'excellent', label: '优秀奖' },
];

export function getAwardLabel(award: string | null | undefined) {
  if (!award) return '';
  const map: Record<string, string> = {
    special: '特等奖', first: '一等奖', second: '二等奖',
    third: '三等奖', excellent: '优秀奖',
  };
  return map[award] || award; // custom awards return their name directly
}

export function getAwardColor(award: string | null | undefined) {
  if (!award) return '';
  const map: Record<string, string> = {
    special: 'bg-red-50 text-red-600 ring-red-200/50',
    first: 'bg-amber-50 text-amber-600 ring-amber-200/50',
    second: 'bg-slate-50 text-slate-600 ring-slate-200/50',
    third: 'bg-orange-50 text-orange-600 ring-orange-200/50',
    excellent: 'bg-sky-50 text-sky-600 ring-sky-200/50',
  };
  return map[award] || 'bg-violet-50 text-violet-600 ring-violet-200/50'; // custom awards get violet style
}

export function isPresetAward(award: string | null | undefined) {
  if (!award) return false;
  return ['special', 'first', 'second', 'third', 'excellent'].includes(award);
}

// 渐变色预设: 每个包含主色 + 副色 + 展示名
export const GRADIENT_PRESETS = [
  { name: '海洋蓝', primary: '#2563eb', secondary: '#06b6d4' },
  { name: '落日紫', primary: '#7c3aed', secondary: '#ec4899' },
  { name: '森林绿', primary: '#059669', secondary: '#84cc16' },
  { name: '晨曦橙', primary: '#f97316', secondary: '#fbbf24' },
  { name: '极光青', primary: '#0ea5e9', secondary: '#10b981' },
  { name: '玫瑰金', primary: '#e11d48', secondary: '#f59e0b' },
  { name: '深夜蓝', primary: '#1e3a8a', secondary: '#7c3aed' },
  { name: '樱花粉', primary: '#db2777', secondary: '#f472b6' },
  { name: '炫彩霓虹', primary: '#8b5cf6', secondary: '#06b6d4' },
  { name: '暖阳金', primary: '#d97706', secondary: '#dc2626' },
];

/**
 * 生成 hero 渐变背景 CSS 字符串
 */
export function buildHeroGradient(config: {
  primaryColor: string;
  secondaryColor?: string | null;
  gradientEnabled?: boolean;
  gradientAngle?: number;
}) {
  const angle = config.gradientAngle ?? 160;
  if (config.gradientEnabled && config.secondaryColor) {
    return `linear-gradient(${angle}deg, ${config.primaryColor}, ${config.secondaryColor})`;
  }
  // 默认: 单色渐变 (与之前一致)
  return `linear-gradient(${angle}deg, ${config.primaryColor}f0, ${config.primaryColor}cc, ${config.primaryColor}90)`;
}
