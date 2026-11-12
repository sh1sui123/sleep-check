// EXPORTS: useSleepApp

import { useState } from 'react';
import { format } from 'date-fns';
import type { IRecoveryPlan, ISleepLog, IUserSettings } from '@/data/types';
import { buildSampleLogs } from '@/data/sample';
import { sortLogs } from '@/lib/sleep';
import { store } from '@/lib/store';

const DEFAULT_SETTINGS: IUserSettings = {
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

export function useSleepApp() {
  const [settings, setSettings] = useState<IUserSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...store.get<Partial<IUserSettings>>('settings', {}),
  }));
  const [logs, setLogs] = useState<ISleepLog[]>(() => sortLogs(store.get<ISleepLog[]>('logs', [])));
  const [plan, setPlan] = useState<IRecoveryPlan | null>(() => store.get<IRecoveryPlan | null>('plan', null));
  const [demo, setDemo] = useState<boolean>(() => store.get<boolean>('demo', false));
  const [snoozeUntil, setSnoozeUntil] = useState<string>(() => store.get<string>('snoozeUntil', ''));

  const updateSettings = (patch: Partial<IUserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    store.set('settings', next);
  };

  const saveLog = (log: ISleepLog) => {
    const next = sortLogs([...logs.filter((l) => l.date !== log.date), log]);
    setLogs(next);
    store.set('logs', next);
    setDemo(false);
    store.set('demo', false);
  };

  const deleteLog = (date: string) => {
    const next = logs.filter((l) => l.date !== date);
    setLogs(next);
    store.set('logs', next);
  };

  const savePlan = (next: IRecoveryPlan | null) => {
    setPlan(next);
    store.set('plan', next);
  };

  const snoozeDisruption = (until: string) => {
    setSnoozeUntil(until);
    store.set('snoozeUntil', until);
  };

  const loadSample = () => {
    const sample = buildSampleLogs();
    setLogs(sample);
    store.set('logs', sample);
    setDemo(true);
    store.set('demo', true);
  };

  const clearAll = () => {
    setLogs([]);
    setDemo(false);
    setPlan(null);
    setSnoozeUntil('');
    store.remove('logs');
    store.remove('plan');
    store.remove('demo');
    store.remove('snoozeUntil');
  };

  const exportData = () => {
    const payload = {
      exportedAt: format(new Date(), 'yyyy-MM-ddTHH:mm:ss'),
      settings,
      logs,
      plan,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anshui-guanjia-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    settings,
    logs,
    plan,
    demo,
    snoozeUntil,
    updateSettings,
    saveLog,
    deleteLog,
    savePlan,
    snoozeDisruption,
    loadSample,
    clearAll,
    exportData,
  };
}
