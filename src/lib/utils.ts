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
