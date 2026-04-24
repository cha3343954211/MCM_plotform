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
