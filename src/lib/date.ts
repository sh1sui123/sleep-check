// EXPORTS: TODAY, NOW_TIME, weekdayLabel, formatDateCN, formatDateShort, lastNDates, dateRange,
// shiftDate, isWeekend, hourLabel, relativeDayLabel

import { addDays, format, parseISO, subDays, differenceInCalendarDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 模块级日期常量：组件 render 期间不直接读取当前时间
export const TODAY = format(new Date(), 'yyyy-MM-dd');
export const NOW_TIME = format(new Date(), 'HH:mm');

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function weekdayLabel(date: string): string {
  return WEEKDAYS[parseISO(date).getDay()];
}

export function formatDateCN(date: string): string {
  return format(parseISO(date), 'M月d日', { locale: zhCN });
}

export function formatDateShort(date: string): string {
  return format(parseISO(date), 'MM/dd');
}

export function lastNDates(n: number, end = TODAY): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(format(subDays(parseISO(end), i), 'yyyy-MM-dd'));
  return out;
}

export function dateRange(startDate: string, days: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i += 1) out.push(format(addDays(parseISO(startDate), i), 'yyyy-MM-dd'));
  return out;
}

export function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

export function isWeekend(date: string): boolean {
  return parseISODay(date) === 0 || parseISODay(date) === 6;
}

export function parseISODay(date: string): number {
  return parseISO(date).getDay();
}

export function hourLabel(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function relativeDayLabel(date: string): string {
  const diff = differenceInCalendarDays(parseISO(date), parseISO(TODAY));
  if (diff === 0) return '今天';
  if (diff === -1) return '昨天';
  if (diff === 1) return '明天';
  if (diff > 1) return `${diff} 天后`;
  return `${-diff} 天前`;
}
