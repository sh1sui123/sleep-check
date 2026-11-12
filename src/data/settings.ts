// EXPORTS: AccountTypeMeta, DEFAULT_SETTINGS, ACCOUNT_TYPES, ACCOUNT_TYPE_META

import type { AccountType, IUserSettings } from '@/data/types';

export interface AccountTypeMeta {
  label: string;
  subtitle: string;
  traits: string;
  targetWake: string;
  targetSleepMinutes: number;
  bedtimeReminder: string;
  paceStep: number;
}

export const DEFAULT_SETTINGS: IUserSettings = {
  targetWake: '07:00',
  targetSleepMinutes: 480,
  recordReminder: '08:00',
  bedtimeReminder: '22:30',
  reminderDays: [0, 1, 2, 3, 4, 5, 6],
  channels: { inApp: true, email: false, push: false },
  disclaimerAccepted: false,
  theme: 'light',
  paceStep: 20,
};

export const ACCOUNT_TYPES: AccountType[] = ['office', 'shift', 'student'];

export const ACCOUNT_TYPE_META: Record<AccountType, AccountTypeMeta> = {
  office: {
    label: '上班族',
    subtitle: '固定通勤时间',
    traits: '工作日必须早起，晚上刷手机拖后入睡，周末补觉',
    targetWake: '07:00',
    targetSleepMinutes: 480,
    bedtimeReminder: '22:30',
    paceStep: 20,
  },
  shift: {
    label: '轮班族',
    subtitle: '夜班或倒班',
    traits: '班次轮换，入睡时间随排班漂移，工作日与休息日节律割裂',
    targetWake: '08:00',
    targetSleepMinutes: 450,
    bedtimeReminder: '23:30',
    paceStep: 15,
  },
  student: {
    label: '学生',
    subtitle: '课表不固定',
    traits: '晚课与自习多，入睡偏晚，周末与工作日差异明显',
    targetWake: '08:30',
    targetSleepMinutes: 510,
    bedtimeReminder: '23:00',
    paceStep: 20,
  },
};
