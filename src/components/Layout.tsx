import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useSleepApp } from '@/hooks/useSleepApp';

const NAV = [
  { path: '/', label: '今天' },
  { path: '/log', label: '记录' },
  { path: '/analysis', label: '分析' },
  { path: '/plan', label: '恢复计划' },
  { path: '/settings', label: '我的' },
];

export const Layout = () => {
  const { settings } = useSleepApp();
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        跳到主要内容
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Moon className="size-5 text-primary" aria-hidden="true" />
            <span className="font-serif text-lg font-semibold tracking-tight">安睡管家</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">不依赖设备，1 分钟记录</span>
          </div>
          <nav aria-label="主导航" className="flex gap-1 overflow-x-auto pb-0.5">
            {NAV.map((item) => {
              const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        <Outlet />
      </main>
      <Toaster position="top-center" />
    </div>
  );
};
