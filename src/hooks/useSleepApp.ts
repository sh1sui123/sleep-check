// EXPORTS: useSleepApp

import { useState } from 'react';
import { format } from 'date-fns';
import type { IRecoveryPlan, ISleepLog, IUserSettings } from '@/data/types';
import { buildSampleLogs } from '@/data/sample';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { useSession } from '@/hooks/useSession';
import { sortLogs } from '@/lib/sleep';
import { store } from '@/lib/store';

export function useSleepApp() {
  const accountId = useSession();
  const scope = accountId || 'guest';
  const key = (name: string) => `${scope}:${name}`;

  const [settings, setSettings] = useState<IUserSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...store.get<Partial<IUserSettings>>(key('settings'), {}),
  }));
  const [logs, setLogs] = useState<ISleepLog[]>(() => sortLogs(store.get<ISleepLog[]>(key('logs'), [])));
  const [plan, setPlan] = useState<IRecoveryPlan | null>(() => store.get<IRecoveryPlan | null>(key('plan'), null));
  const [demo, setDemo] = useState<boolean>(() => store.get<boolean>(key('demo'), false));
  const [snoozeUntil, setSnoozeUntil] = useState<string>(() => store.get<string>(key('snoozeUntil'), ''));

  const updateSettings = (patch: Partial<IUserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    store.set(key('settings'), next);
  };

  const saveLog = (log: ISleepLog) => {
    const next = sortLogs([...logs.filter((l) => l.date !== log.date), log]);
    setLogs(next);
    store.set(key('logs'), next);
    setDemo(false);
    store.set(key('demo'), false);
  };

  const deleteLog = (date: string) => {
    const next = logs.filter((l) => l.date !== date);
    setLogs(next);
    store.set(key('logs'), next);
  };

  const savePlan = (next: IRecoveryPlan | null) => {
    setPlan(next);
    store.set(key('plan'), next);
  };

  const snoozeDisruption = (until: string) => {
    setSnoozeUntil(until);
    store.set(key('snoozeUntil'), until);
  };

  const loadSample = () => {
    const sample = buildSampleLogs();
    setLogs(sample);
    store.set(key('logs'), sample);
    setDemo(true);
    store.set(key('demo'), true);
  };

  const clearAll = () => {
    setLogs([]);
    setDemo(false);
    setPlan(null);
    setSnoozeUntil('');
    store.remove(key('logs'));
    store.remove(key('plan'));
    store.remove(key('demo'));
    store.remove(key('snoozeUntil'));
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
