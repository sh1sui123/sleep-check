// EXPORTS: getAccounts, getSessionId, setSessionId, createAccount, deleteAccount,
// accountLogCount, findAccount, subscribeAccounts, subscribeSession

import { ACCOUNT_TYPE_META, DEFAULT_SETTINGS } from '@/data/settings';
import type { AccountType, IAccount, IRecoveryPlan, ISleepLog, IUserSettings } from '@/data/types';
import { store } from '@/lib/store';

const ACCOUNTS_KEY = 'accounts';
const SESSION_KEY = 'session';
const SCOPED_KEYS = ['settings', 'logs', 'plan', 'demo', 'snoozeUntil'] as const;
const LEGACY_SETTINGS_KEY = 'settings';

function readAccounts(): IAccount[] {
  const value = store.get<IAccount[] | null>(ACCOUNTS_KEY, null);
  return Array.isArray(value) ? value : [];
}

function readSession(): string {
  const value = store.get<string | null>(SESSION_KEY, null);
  return typeof value === 'string' ? value : '';
}

let accounts: IAccount[] = readAccounts();
let sessionId: string = readSession();

const accountListeners = new Set<() => void>();
const sessionListeners = new Set<() => void>();

export function getAccounts(): IAccount[] {
  return accounts;
}

export function getSessionId(): string {
  return sessionId;
}

export function findAccount(id: string): IAccount | undefined {
  return accounts.find((account) => account.id === id);
}

export function accountLogCount(id: string): number {
  const logs = store.get<ISleepLog[] | null>(`${id}:logs`, null);
  return Array.isArray(logs) ? logs.length : 0;
}

export function subscribeAccounts(listener: () => void): () => void {
  accountListeners.add(listener);
  return () => {
    accountListeners.delete(listener);
  };
}

export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function setSessionId(id: string) {
  sessionId = id;
  store.set(SESSION_KEY, id ? id : null);
  sessionListeners.forEach((listener) => listener());
}

function readLegacy(): { logs: ISleepLog[]; plan: IRecoveryPlan | null; settings: Partial<IUserSettings> | null } {
  const logs = store.get<ISleepLog[] | null>('logs', null);
  const plan = store.get<IRecoveryPlan | null>('plan', null);
  const settings = store.get<Partial<IUserSettings> | null>(LEGACY_SETTINGS_KEY, null);
  return {
    logs: Array.isArray(logs) ? logs : [],
    plan,
    settings,
  };
}

function clearLegacy() {
  SCOPED_KEYS.forEach((key) => store.remove(key));
}

export function createAccount(name: string, type: AccountType): IAccount {
  const meta = ACCOUNT_TYPE_META[type];
  const id = `a${Date.now().toString(36)}${accounts.length + 1}`;
  const account: IAccount = {
    id,
    name: name.trim() || meta.label,
    type,
    createdAt: new Date().toISOString(),
  };

  const defaults: IUserSettings = {
    ...DEFAULT_SETTINGS,
    targetWake: meta.targetWake,
    targetSleepMinutes: meta.targetSleepMinutes,
    bedtimeReminder: meta.bedtimeReminder,
    paceStep: meta.paceStep,
  };

  const isFirst = accounts.length === 0;
  const legacy = isFirst ? readLegacy() : null;

  store.set(`${id}:settings`, legacy && legacy.settings ? { ...defaults, ...legacy.settings } : defaults);
  if (legacy && legacy.logs.length > 0) store.set(`${id}:logs`, legacy.logs);
  if (legacy && legacy.plan) store.set(`${id}:plan`, legacy.plan);
  if (legacy) clearLegacy();

  accounts = [...accounts, account];
  store.set(ACCOUNTS_KEY, accounts);
  accountListeners.forEach((listener) => listener());
  return account;
}

export function deleteAccount(id: string) {
  accounts = accounts.filter((account) => account.id !== id);
  store.set(ACCOUNTS_KEY, accounts);
  SCOPED_KEYS.forEach((key) => store.remove(`${id}:${key}`));
  if (sessionId === id) setSessionId('');
  accountListeners.forEach((listener) => listener());
}
