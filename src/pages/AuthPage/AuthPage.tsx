import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Moon, Sparkles, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_META } from '@/data/settings';
import type { AccountType } from '@/data/types';
import { useAccounts, useSession } from '@/hooks/useSession';
import { accountLogCount, createAccount, findAccount, setSessionId } from '@/lib/account';
import { cn } from '@/lib/utils';

export default function AuthPage() {
  const navigate = useNavigate();
  const session = useSession();
  const accounts = useAccounts();
  const [tabName, setTabName] = useState('login');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('office');

  const current = session ? findAccount(session) : undefined;
  if (current) return <Navigate to="/" replace />;

  const enter = (accountId: string) => {
    setSessionId(accountId);
    navigate('/', { replace: true });
  };

  const register = () => {
    if (!name.trim()) {
      toast.error('先给账号起一个名字');
      return;
    }
    const account = createAccount(name, type);
    setSessionId(account.id);
    toast.success(`已创建「${account.name}」，目标作息按${ACCOUNT_TYPE_META[type].label}预设`);
    navigate('/', { replace: true });
  };

  const meta = ACCOUNT_TYPE_META[type];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2">
          <Moon className="size-5 text-primary" aria-hidden="true" />
          <span className="font-serif text-lg font-semibold tracking-tight">安睡管家</span>
          <Badge variant="outline">本地账号</Badge>
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight tracking-tight">
          先登录，再看你的睡眠节律
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          不同人群的作息基线不一样：上班族、轮班族、学生各有默认目标起床时间与睡眠目标。选一个类型注册，数据只属于这个账号。
        </p>

        <Card className="mt-6">
          <CardHeader className="gap-1">
            <CardTitle className="text-base">进入安睡管家</CardTitle>
            <CardDescription>账号与会话保存在当前浏览器本地，用于演示多账号流程，不联网。</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tabName} onValueChange={setTabName}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">登录已有账号</TabsTrigger>
                <TabsTrigger value="register">注册新账号</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4 space-y-2">
                {accounts.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
                    <UserRound className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-2 text-sm text-muted-foreground">本机还没有账号，先到「注册新账号」建一个。</p>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => enter(account.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3 text-left hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ACCOUNT_TYPE_META[account.type].label} · {accountLogCount(account.id)} 条记录
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  ))
                )}
              </TabsContent>

              <TabsContent value="register" className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accountName">账号名称</Label>
                  <Input
                    id="accountName"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="例如：夜班小王"
                    className="h-11 text-base"
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label>账号类型</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ACCOUNT_TYPES.map((item) => {
                      const itemMeta = ACCOUNT_TYPE_META[item];
                      const active = item === type;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setType(item)}
                          aria-pressed={active}
                          className={cn(
                            'rounded-md border px-3 py-2 text-left transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card hover:bg-accent',
                          )}
                        >
                          <span className="block text-sm font-medium">{itemMeta.label}</span>
                          <span
                            className={cn(
                              'mt-0.5 block text-xs',
                              active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                            )}
                          >
                            {itemMeta.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">{meta.traits}</p>
                </div>

                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  注册后默认：目标起床 {meta.targetWake}，睡眠目标 {Math.floor(meta.targetSleepMinutes / 60)} 小时
                  {meta.targetSleepMinutes % 60 ? ` ${meta.targetSleepMinutes % 60} 分` : ''}，睡前提醒{' '}
                  {meta.bedtimeReminder}。进入后可在「我的」里改。
                </div>

                <Button type="button" className="h-11 w-full" onClick={register}>
                  <Sparkles className="mr-1 size-4" aria-hidden="true" /> 创建账号并进入
                </Button>
                <p className="text-xs text-muted-foreground">
                  第一次创建的账号会自动接收本机已有的睡眠记录（如果之前没有账号时记录过数据）。
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground">
          说明：本版本不提供服务端账号体系，账号用于区分不同人群的作息档案；换设备或换浏览器不会同步数据。
        </p>
      </div>
    </div>
  );
}
