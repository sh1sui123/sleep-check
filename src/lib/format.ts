// EXPORTS: formatDuration, formatHoursShort, formatPercent, formatMinutes, formatDelta, greeting

import { NOW_TIME } from './date';
import { toMinutes } from './sleep';

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分`;
}

export function formatHoursShort(minutes: number): string {
  return `${Math.round((minutes / 60) * 10) / 10}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDelta(minutes: number): string {
  const sign = minutes > 0 ? '+' : '';
  return `${sign}${Math.round(minutes)} 分钟`;
}

export function greeting(): string {
  const hour = Math.floor(toMinutes(NOW_TIME) / 60);
  if (hour < 5) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}
