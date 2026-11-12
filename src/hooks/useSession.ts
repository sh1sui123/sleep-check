// EXPORTS: useSession, useAccounts

import { useSyncExternalStore } from 'react';
import type { IAccount } from '@/data/types';
import { getAccounts, getSessionId, subscribeAccounts, subscribeSession } from '@/lib/account';

export function useSession(): string {
  return useSyncExternalStore(subscribeSession, getSessionId, getSessionId);
}

export function useAccounts(): IAccount[] {
  return useSyncExternalStore(subscribeAccounts, getAccounts, getAccounts);
}
