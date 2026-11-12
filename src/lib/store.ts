// EXPORTS: store

const NS = 'sleep-guardian';

export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`${NS}:${key}`);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
    } catch {
      // 隐私模式下静默降级，不阻断界面
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(`${NS}:${key}`);
    } catch {
      // 同上
    }
  },
};
