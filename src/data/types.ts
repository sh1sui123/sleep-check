// EXPORTS: CaffeineLevel, ISleepLog, IUserSettings, ISleepMetrics, IDisruptionReason,
// IDisruptionResult, IPlanTask, IPlanDay, IRecoveryPlan, IPlanReview

export type CaffeineLevel = 'none' | 'afternoon' | 'evening';

export interface ISleepLog {
  date: string; // 起床当天日期 yyyy-MM-dd
  bedTime: string; // HH:mm 上床时间
  wakeTime: string; // HH:mm 起床时间
  latency: number; // 入睡用时（分钟）
  wakeCount: number; // 夜间清醒次数
  wakeMinutes: number; // 夜间清醒总时长（分钟）
  quality: number; // 主观质量 1-5
  napMinutes: number; // 午睡分钟
  caffeine: CaffeineLevel;
  screenMinutes: number; // 睡前屏幕使用分钟
  stress: number; // 压力 1-5，0 表示未填
  note: string;
  updatedAt: string;
}

export interface IUserSettings {
  targetWake: string; // 目标起床时间 HH:mm
  targetSleepMinutes: number; // 目标睡眠时长（分钟）
  recordReminder: string; // 记录提醒时间 HH:mm
  bedtimeReminder: string; // 睡前准备提醒时间 HH:mm
  reminderDays: number[]; // 0=周日 ... 6=周六
  channels: { inApp: boolean; email: boolean; push: boolean };
  disclaimerAccepted: boolean;
  theme: 'light' | 'dark';
  paceStep: number; // 每日调整幅度（分钟）
}

export interface ISleepMetrics {
  count: number;
  avgAsleep: number;
  avgInBed: number;
  avgEfficiency: number;
  avgLatency: number;
  sleepDebt: number;
  bedSd: number;
  midpointSd: number;
  weekdayMidpoint: number;
  weekendMidpoint: number;
  midpointGap: number;
}

export interface IDisruptionReason {
  code: 'regularity' | 'deficit' | 'weekend';
  label: string;
  detail: string;
  value: number;
  threshold: number;
}

export interface IDisruptionResult {
  enoughData: boolean;
  triggered: boolean;
  reasons: IDisruptionReason[];
  severity: 'low' | 'medium' | 'high';
  sampleDays: number;
}

export interface IPlanTask {
  id: string;
  label: string;
  hint: string;
}

export interface IPlanDay {
  index: number;
  date: string;
  targetWake: string;
  targetBed: string;
  tasks: IPlanTask[];
  done: string[]; // 已完成任务 id
  checkedIn: boolean;
  note: string;
}

export interface IRecoveryPlan {
  id: string;
  createdAt: string;
  startDate: string;
  status: 'active' | 'paused' | 'completed' | 'terminated';
  step: number;
  startWake: string;
  targetWake: string;
  targetBed: string;
  days: IPlanDay[];
  note: string;
  paceNote: string;
}

export interface IPlanReview {
  hasData: boolean;
  beforeSd: number;
  afterSd: number;
  beforeAsleep: number;
  afterAsleep: number;
  completedDays: number;
  totalDays: number;
  summary: string;
}
