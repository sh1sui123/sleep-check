// EXPORTS: toMinutes, fromMinutes, wrapSigned, inBedMinutes, logDerived, sortLogs, aggregateMetrics,
// disruptionCheck, bedtimeSd, sleepDebt, generatePlan, checkinPlanDay, rebuildPlan, resumePlan,
// reviewPlan, factorInsight

import { addDays, parseISO, format } from 'date-fns';
import type {
  ISleepLog,
  IUserSettings,
  ISleepMetrics,
  IDisruptionResult,
  IDisruptionReason,
  IRecoveryPlan,
  IPlanDay,
  IPlanTask,
  IPlanReview,
} from '@/data/types';
import { isWeekend, TODAY } from './date';

const DAY = 1440;

export interface ILogDerived {
  inBed: number;
  asleep: number;
  efficiency: number;
  midpoint: number;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(minutes: number): string {
  const m = ((Math.round(minutes) % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 返回落在 (-720, 720] 区间内的带符号分钟差 */
export function wrapSigned(value: number, period = DAY): number {
  const v = ((value % period) + period) % period;
  return v > period / 2 ? v - period : v;
}

/** 在床时间（分钟），跨零点正确处理；异常数据返回 0 */
export function inBedMinutes(bedTime: string, wakeTime: string): number {
  const diff = wrapSigned(toMinutes(wakeTime) - toMinutes(bedTime));
  return diff > 0 ? diff : 0;
}

export function logDerived(log: ISleepLog): ILogDerived {
  const inBed = inBedMinutes(log.bedTime, log.wakeTime);
  const asleep = Math.max(0, inBed - log.latency - log.wakeMinutes);
  const efficiency = inBed > 0 ? Math.min(1, asleep / inBed) : 0;
  const midpoint = toMinutes(log.bedTime) + inBed / 2;
  return { inBed, asleep, efficiency, midpoint };
}

export function sortLogs(logs: ISleepLog[]): ISleepLog[] {
  return [...logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function recentLogs(logs: ISleepLog[], days: number): ISleepLog[] {
  const sorted = sortLogs(logs);
  return sorted.slice(Math.max(0, sorted.length - days));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
}

/** 入睡时间相对 22:00 的偏移，用于计算波动 */
export function bedtimeOffset(log: ISleepLog): number {
  return wrapSigned(toMinutes(log.bedTime) - 22 * 60);
}

/** 睡眠中点相对 04:00 的偏移 */
export function midpointOffset(log: ISleepLog): number {
  return wrapSigned(logDerived(log).midpoint - 4 * 60);
}

export function bedtimeSd(logs: ISleepLog[]): number {
  return stdev(logs.map(bedtimeOffset));
}

export function sleepDebt(logs: ISleepLog[], targetMinutes: number): number {
  return logs.reduce((sum, log) => sum + Math.max(0, targetMinutes - logDerived(log).asleep), 0);
}

export function aggregateMetrics(logs: ISleepLog[], targetMinutes: number): ISleepMetrics {
  const rows = sortLogs(logs);
  const derived = rows.map(logDerived);
  const weekdayMids = rows.filter((l) => !isWeekend(l.date)).map(midpointOffset);
  const weekendMids = rows.filter((l) => isWeekend(l.date)).map(midpointOffset);
  const weekdayMidpoint = weekdayMids.length ? mean(weekdayMids) : 0;
  const weekendMidpoint = weekendMids.length ? mean(weekendMids) : 0;
  return {
    count: rows.length,
    avgAsleep: mean(derived.map((d) => d.asleep)),
    avgInBed: mean(derived.map((d) => d.inBed)),
    avgEfficiency: mean(derived.map((d) => d.efficiency)),
    avgLatency: mean(rows.map((l) => l.latency)),
    sleepDebt: sleepDebt(rows, targetMinutes),
    bedSd: stdev(rows.map(bedtimeOffset)),
    midpointSd: stdev(rows.map(midpointOffset)),
    weekdayMidpoint,
    weekendMidpoint,
    midpointGap: weekdayMids.length >= 2 && weekendMids.length >= 2 ? Math.abs(wrapSigned(weekdayMidpoint - weekendMidpoint)) : 0,
  };
}

export function disruptionCheck(logs: ISleepLog[], settings: IUserSettings): IDisruptionResult {
  const window = recentLogs(logs, 7);
  const enoughData = window.length >= 3;
  if (!enoughData) {
    return { enoughData: false, triggered: false, reasons: [], severity: 'low', sampleDays: window.length };
  }
  const reasons: IDisruptionReason[] = [];

  const sd = bedtimeSd(window);
  if (sd > 90) {
    reasons.push({
      code: 'regularity',
      label: '入睡时间波动偏大',
      detail: `近 ${window.length} 天入睡时间的标准差约 ${Math.round(sd)} 分钟，超过 90 分钟。`,
      value: Math.round(sd),
      threshold: 90,
    });
  }

  const last3 = window.slice(-3);
  if (last3.length === 3) {
    const shortAll = last3.every((log) => settings.targetSleepMinutes - logDerived(log).asleep >= 90);
    if (shortAll) {
      const gap = Math.round(mean(last3.map((log) => settings.targetSleepMinutes - logDerived(log).asleep)));
      reasons.push({
        code: 'deficit',
        label: '连续 3 天睡眠不足',
        detail: `最近 3 天每天都比目标少睡 1.5 小时以上，平均少 ${Math.round(gap / 60 * 10) / 10} 小时。`,
        value: gap,
        threshold: 90,
      });
    }
  }

  const metrics = aggregateMetrics(window, settings.targetSleepMinutes);
  if (metrics.midpointGap > 120) {
    reasons.push({
      code: 'weekend',
      label: '工作日与周末节律差过大',
      detail: `工作日与周末的睡眠中点相差约 ${Math.round(metrics.midpointGap / 60 * 10) / 10} 小时，超过 2 小时。`,
      value: Math.round(metrics.midpointGap),
      threshold: 120,
    });
  }

  const severity: IDisruptionResult['severity'] = reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'low';
  return { enoughData, triggered: reasons.length > 0, reasons, severity, sampleDays: window.length };
}

const TASK_LIBRARY: Record<string, IPlanTask> = {
  wake: { id: 'wake', label: '按目标时间起床', hint: '闹钟放在离床远一点的位置，起床后先拉开窗帘。' },
  light: { id: 'light', label: '晨间光照 15 分钟', hint: '起床后一小时内到窗边或户外，让眼睛接触自然光。' },
  caffeine: { id: 'caffeine', label: '咖啡因截止时间', hint: '午后不再摄入咖啡、浓茶与含咖啡因饮料。' },
  relax: { id: 'relax', label: '睡前 30 分钟放松', hint: '调暗室内灯光，放下手机，做缓慢呼吸或简单拉伸。' },
};

function makeTasks(): IPlanTask[] {
  return [TASK_LIBRARY.wake, TASK_LIBRARY.light, TASK_LIBRARY.caffeine, TASK_LIBRARY.relax];
}

function averageBedAndWake(logs: ISleepLog[], settings: IUserSettings): { bed: number; wake: number } {
  const rows = recentLogs(logs, 7);
  if (!rows.length) {
    return {
      bed: toMinutes(settings.targetWake) - settings.targetSleepMinutes,
      wake: toMinutes(settings.targetWake),
    };
  }
  const bedOffsets = rows.map(bedtimeOffset);
  const wakeOffsets = rows.map((log) => wrapSigned(toMinutes(log.wakeTime) - 7 * 60));
  return {
    bed: 22 * 60 + mean(bedOffsets),
    wake: 7 * 60 + mean(wakeOffsets),
  };
}

export function generatePlan(
  logs: ISleepLog[],
  settings: IUserSettings,
  step: number,
  targetWake: string,
): IRecoveryPlan {
  const avg = averageBedAndWake(logs, settings);
  const targetWakeMin = toMinutes(targetWake);
  const shift = wrapSigned(avg.wake - targetWakeMin); // >0 表示当前起床更晚，需要提前
  const need = Math.abs(shift);
  const neededDays = Math.max(1, Math.ceil(need / step));
  const days = Math.min(28, Math.max(7, neededDays));
  const targetSleep = settings.targetSleepMinutes;

  let note = '';
  if (neededDays > 14) {
    note = `需要调整的跨度约 ${Math.round(need / 60 * 10) / 10} 小时，超过两周的常规节奏，计划已延长到 ${days} 天，让每天的移动保持在 ${step} 分钟内。`;
  } else if (neededDays < 7) {
    note = `当前作息与目标只差 ${Math.round(need)} 分钟，计划仍按 7 天走完，留出稳定节奏的时间。`;
  }

  const startDate = format(addDays(parseISO(TODAY), 1), 'yyyy-MM-dd');
  const startWake = avg.wake;
  const planDays: IPlanDay[] = [];
  for (let i = 0; i < days; i += 1) {
    const moved = Math.min(need, step * (i + 1));
    const wakeMin = startWake - Math.sign(shift) * moved;
    planDays.push({
      index: i + 1,
      date: format(addDays(parseISO(startDate), i), 'yyyy-MM-dd'),
      targetWake: fromMinutes(wakeMin),
      targetBed: fromMinutes(wakeMin - targetSleep),
      tasks: makeTasks(),
      done: [],
      checkedIn: false,
      note: '',
    });
  }

  return {
    id: `plan-${TODAY}`,
    createdAt: TODAY,
    startDate,
    status: 'active',
    step,
    startWake: fromMinutes(startWake),
    targetWake,
    targetBed: fromMinutes(targetWakeMin - targetSleep),
    days: planDays,
    note,
    paceNote: '',
  };
}

function isDayPassed(date: string): boolean {
  return date < TODAY;
}

export function checkinPlanDay(plan: IRecoveryPlan, date: string, done: string[]): IRecoveryPlan {
  const nextDays = plan.days.map((day) => (day.date === date ? { ...day, done, checkedIn: true } : day));
  const lastDay = nextDays[nextDays.length - 1];
  const finished = lastDay.checkedIn;
  return { ...plan, days: nextDays, status: finished ? 'completed' : plan.status };
}

/** 连续 2 天未达标 → 幅度减半；连续 3 天达标 → 幅度加快，最多 30 分钟 */
export function paceAdjustment(plan: IRecoveryPlan): { action: 'slow' | 'speed' | 'none'; step: number; note: string } {
  const done = plan.days.filter((d) => d.checkedIn);
  const tail = done.slice(-4);
  const qualified = (day: IPlanDay) => day.done.length >= 2;
  const lastTwo = done.slice(-2);
  const lastThree = done.slice(-3);

  if (tail.length && lastTwo.length === 2 && lastTwo.every((d) => !qualified(d)) && plan.step * 0.5 >= 10) {
    return {
      action: 'slow',
      step: Math.max(10, Math.round(plan.step / 2)),
      note: '连续 2 天没达标，接下来几天把调整幅度减半，先把节奏稳住。',
    };
  }
  if (lastThree.length === 3 && lastThree.every(qualified) && plan.step < 30 && plan.step * 1.5 <= 30) {
    return {
      action: 'speed',
      step: Math.min(30, Math.round(plan.step * 1.5)),
      note: '连续 3 天完成得不错，接下来可以稍稍加快一点。',
    };
  }
  return { action: 'none', step: plan.step, note: '' };
}

export function rebuildPlan(plan: IRecoveryPlan, step: number, note: string): IRecoveryPlan {
  const kept = plan.days.filter((d) => d.checkedIn || d.date <= TODAY);
  const targetWakeMin = toMinutes(plan.targetWake);
  const targetSleep = inBedMinutes(plan.targetBed, plan.targetWake);
  const lastWake = kept.length ? toMinutes(kept[kept.length - 1].targetWake) : toMinutes(plan.startWake);
  const remainingShift = wrapSigned(lastWake - targetWakeMin);
  const remaining = Math.abs(remainingShift);
  const steps = Math.max(1, Math.ceil(remaining / step));
  const baseDate = kept.length
    ? format(addDays(parseISO(kept[kept.length - 1].date), 1), 'yyyy-MM-dd')
    : plan.startDate;
  const rebuilt: IPlanDay[] = kept.map((d) => d);
  for (let i = 0; i < steps; i += 1) {
    const moved = Math.min(remaining, step * (i + 1));
    const wakeMin = lastWake - Math.sign(remainingShift) * moved;
    rebuilt.push({
      index: kept.length + i + 1,
      date: format(addDays(parseISO(baseDate), i), 'yyyy-MM-dd'),
      targetWake: fromMinutes(wakeMin),
      targetBed: fromMinutes(wakeMin - targetSleep),
      tasks: makeTasks(),
      done: [],
      checkedIn: false,
      note: '',
    });
  }
  return { ...plan, days: rebuilt, step, paceNote: note };
}

export function resumePlan(plan: IRecoveryPlan): IRecoveryPlan {
  const kept = plan.days.filter((d) => d.checkedIn);
  const pending = plan.days.filter((d) => !d.checkedIn);
  const baseDate = TODAY;
  const days = kept.map((d) => d);
  pending.forEach((day, i) => {
    days.push({ ...day, index: kept.length + i + 1, date: format(addDays(parseISO(baseDate), i + 1), 'yyyy-MM-dd') });
  });
  return { ...plan, status: 'active', days };
}

export function planToday(plan: IRecoveryPlan): IPlanDay | null {
  return plan.days.find((d) => d.date === TODAY) ?? null;
}

export function reviewPlan(plan: IRecoveryPlan, logs: ISleepLog[]): IPlanReview {
  const before = sortLogs(logs).filter((l) => l.date < plan.startDate).slice(-7);
  const after = sortLogs(logs).filter((l) => l.date >= plan.startDate).slice(-7);
  if (!before.length || !after.length) {
    return {
      hasData: false,
      beforeSd: 0,
      afterSd: 0,
      beforeAsleep: 0,
      afterAsleep: 0,
      completedDays: plan.days.filter((d) => d.checkedIn).length,
      totalDays: plan.days.length,
      summary: '前后数据还不够做对比，继续记录几天就能看到变化。',
    };
  }
  const beforeSd = stdev(before.map(bedtimeOffset));
  const afterSd = stdev(after.map(bedtimeOffset));
  const beforeAsleep = mean(before.map((l) => logDerived(l).asleep));
  const afterAsleep = mean(after.map((l) => logDerived(l).asleep));
  const deltaSd = beforeSd - afterSd;
  const summary =
    deltaSd > 0
      ? `入睡时间波动从 ${Math.round(beforeSd)} 分钟缩小到 ${Math.round(afterSd)} 分钟，约改善 ${Math.round((deltaSd / (beforeSd || 1)) * 100)}%。`
      : `入睡时间波动暂时没有缩小（${Math.round(beforeSd)} → ${Math.round(afterSd)} 分钟），可以先把固定起床时间守住。`;
  return {
    hasData: true,
    beforeSd,
    afterSd,
    beforeAsleep,
    afterAsleep,
    completedDays: plan.days.filter((d) => d.checkedIn).length,
    totalDays: plan.days.length,
    summary,
  };
}

export function factorInsight(logs: ISleepLog[]): { enough: boolean; text: string; withCaffeine: number; withoutCaffeine: number } {
  const rows = logs.filter((l) => l.caffeine !== 'none');
  const all = logs;
  if (all.length < 10 || rows.length < 3) {
    return { enough: false, text: '', withCaffeine: 0, withoutCaffeine: 0 };
  }
  const withC = mean(logs.filter((l) => l.caffeine === 'evening').map((l) => logDerived(l).efficiency));
  const withoutC = mean(logs.filter((l) => l.caffeine !== 'evening').map((l) => logDerived(l).efficiency));
  if (Number.isNaN(withC) || Number.isNaN(withoutC)) {
    return { enough: false, text: '', withCaffeine: 0, withoutCaffeine: 0 };
  }
  return {
    enough: true,
    text: `有晚间咖啡因的 ${logs.filter((l) => l.caffeine === 'evening').length} 天里，睡眠效率平均 ${Math.round(withC * 100)}%；其余 ${logs.filter((l) => l.caffeine !== 'evening').length} 天平均 ${Math.round(withoutC * 100)}%。这可能相关，但还不能说明因果。`,
    withCaffeine: Math.round(withC * 100),
    withoutCaffeine: Math.round(withoutC * 100),
  };
}

export function isAbnormal(log: Pick<ISleepLog, 'bedTime' | 'wakeTime'>): boolean {
  const minutes = inBedMinutes(log.bedTime, log.wakeTime);
  return minutes < 60 || minutes > 16 * 60;
}

export function isDayPast(date: string): boolean {
  return isDayPassed(date);
}
