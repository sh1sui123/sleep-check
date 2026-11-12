import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Database, Download, LogOut, Moon, ShieldCheck, Sparkles, Sun, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSleepApp } from '@/hooks/useSleepApp';
import { useAccounts, useSession } from '@/hooks/useSession';
import { deleteAccount, setSessionId } from '@/lib/account';
import { ACCOUNT_TYPE_META } from '@/data/settings';
import { generatePlan } from '@/lib/sleep';
import { formatDuration } from '@/lib/format';

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function SettingsPage() {
  const { settings, logs, plan, demo, updateSettings, savePlan, loadSample, clearAll, exportData } = useSleepApp();
  const navigate = useNavigate();
  const session = useSession();
  const accounts = useAccounts();
  const current = accounts.find((account) => account.id === session);
  const otherAccounts = accounts.filter((account) => account.id !== session);
  const [clearOpen, setClearOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const switchAccount = () => {
    setSessionId('');
    toast.success('已退出当前账号');
    navigate('/auth', { replace: true });
  };

  const removeCurrentAccount = () => {
    if (!current) return;
    deleteAccount(current.id);
    setRemoveOpen(false);
    toast.success(`已删除账号「${current.name}」`);
    navigate('/auth', { replace: true });
  };

  const changeTargetWake = (value: string) => {
    if (!value) return;
    updateSettings({ targetWake: value });
    if (plan && plan.status === 'active') {
      savePlan(generatePlan(logs, { ...settings, targetWake: value }, plan.step, value));
      toast.success('目标起床时间已更新，恢复计划已重新生成');
      return;
    }
    toast.success('目标起床时间已更新');
  };

  const changeTargetSleep = (minutes: number) => {
    updateSettings({ targetSleepMinutes: minutes });
    if (plan && plan.status === 'active') {
      savePlan(generatePlan(logs, { ...settings, targetSleepMinutes: minutes }, plan.step, settings.targetWake));
      toast.success('目标睡眠时长已更新，计划已重新生成');
      return;
    }
    toast.success('目标睡眠时长已更新');
  };

  const togglePush = async (enabled: boolean) => {
    if (!enabled) {
      updateSettings({ channels: { ...settings.channels, push: false } });
      return;
    }
    if (typeof Notification === 'undefined') {
      toast.error('当前浏览器不支持 Web 推送，已保留站内通知');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateSettings({ channels: { ...settings.channels, push: true } });
      toast.success('已开启 Web 推送');
    } else {
      toast.error('未获得通知权限，已降级为站内提示');
    }
  };

  const toggleDay = (day: number) => {
    const days = settings.reminderDays.includes(day)
      ? settings.reminderDays.filter((d) => d !== day)
      : [...settings.reminderDays, day].sort((a, b) => a - b);
    updateSettings({ reminderDays: days });
  };

  const changeTheme = (dark: boolean) => {
    updateSettings({ theme: dark ? 'dark' : 'light' });
    document.documentElement.classList.toggle('dark', dark);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">我的</h1>
        <p className="mt-1 text-sm text-muted-foreground">目标作息、提醒、数据都放在这里。</p>
      </div>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4 text-primary" aria-hidden="true" /> 当前账号
          </CardTitle>
          <CardDescription>账号决定目标作息的默认值与数据归属，数据仍只保存在本浏览器。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {current ? (
            <div className="rounded-md border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium">{current.name}</p>
                <Badge variant="secondary">{ACCOUNT_TYPE_META[current.type].label}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{ACCOUNT_TYPE_META[current.type].traits}</p>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                创建于 {format(new Date(current.createdAt), 'yyyy-MM-dd')} · 本周机还有 {otherAccounts.length} 个账号
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">当前未登录账号。</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={switchAccount}>
              <LogOut className="mr-1 size-3.5" aria-hidden="true" /> 切换账号
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRemoveOpen(true)}>
              <Trash2 className="mr-1 size-3.5" aria-hidden="true" /> 删除当前账号
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">目标作息</CardTitle>
          <CardDescription>目标变了，进行中的恢复计划会自动重新生成。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="targetWake">目标起床时间</Label>
            <Input
              id="targetWake"
              type="time"
              value={settings.targetWake}
              onChange={(e) => changeTargetWake(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="targetSleep">目标睡眠时长</Label>
            <div className="flex flex-wrap gap-1.5" id="targetSleep">
              {[420, 450, 480, 510, 540].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => changeTargetSleep(minutes)}
                  aria-pressed={settings.targetSleepMinutes === minutes}
                  className={`h-11 rounded-md border px-3 text-sm tabular-nums ${
                    settings.targetSleepMinutes === minutes
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {Math.floor(minutes / 60)} 小时{minutes % 60 ? ` ${minutes % 60} 分` : ''}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">当前目标 {formatDuration(settings.targetSleepMinutes)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">提醒</CardTitle>
          <CardDescription>站内提示始终可用，邮件与 Web 推送为可选渠道。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="recordReminder">记录提醒时间</Label>
              <Input
                id="recordReminder"
                type="time"
                value={settings.recordReminder}
                onChange={(e) => updateSettings({ recordReminder: e.target.value || settings.recordReminder })}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedtimeReminder">睡前准备提醒</Label>
              <Input
                id="bedtimeReminder"
                type="time"
                value={settings.bedtimeReminder}
                onChange={(e) => updateSettings({ bedtimeReminder: e.target.value || settings.bedtimeReminder })}
                className="h-11 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>重复日</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, index) => {
                const active = settings.reminderDays.includes(index);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(index)}
                    aria-pressed={active}
                    className={`size-11 rounded-md border text-sm ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    周{label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">站内提示</p>
                <p className="text-xs text-muted-foreground">打开应用时，如果到了提醒时间还没记录，会在首页提示。</p>
              </div>
              <Switch
                checked={settings.channels.inApp}
                onCheckedChange={(checked) => updateSettings({ channels: { ...settings.channels, inApp: checked } })}
                aria-label="站内提示"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">邮件提醒</p>
                <p className="text-xs text-muted-foreground">当前版本未接入邮件服务，渠道保留，实际只走站内提示。</p>
              </div>
              <Switch
                checked={settings.channels.email}
                onCheckedChange={(checked) => updateSettings({ channels: { ...settings.channels, email: checked } })}
                aria-label="邮件提醒"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Web 推送</p>
                <p className="text-xs text-muted-foreground">开启时会向浏览器申请通知权限，被拒绝就降级为站内提示。</p>
              </div>
              <Switch checked={settings.channels.push} onCheckedChange={togglePush} aria-label="Web 推送" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">外观</CardTitle>
          <CardDescription>夜间使用可以切到深色，减少刺眼。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              {settings.theme === 'dark' ? (
                <Moon className="size-4 text-primary" aria-hidden="true" />
              ) : (
                <Sun className="size-4 text-primary" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-medium">深色模式</p>
                <p className="text-xs text-muted-foreground">当前为{settings.theme === 'dark' ? '深色' : '浅色'}主题。</p>
              </div>
            </div>
            <Switch
              checked={settings.theme === 'dark'}
              onCheckedChange={changeTheme}
              aria-label="深色模式"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> 健康声明
          </CardTitle>
          <CardDescription>本产品不提供医疗诊断，也不替代医生。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            安睡管家依据通用睡眠卫生与节律调整原则给出趋势分析与行为建议。若出现长期严重失眠、白天嗜睡影响驾驶或工作、夜间呼吸暂停等情况，请优先就医。
          </p>
          <div className="flex items-center gap-2">
            <Badge variant={settings.disclaimerAccepted ? 'default' : 'outline'}>
              {settings.disclaimerAccepted ? '已确认' : '未确认'}
            </Badge>
            <Button asChild variant="ghost" size="sm">
              <Link to="/plan">去计划页确认</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-primary" aria-hidden="true" /> 数据管理
          </CardTitle>
          <CardDescription>
            共 {logs.length} 条记录{plan ? '，1 份恢复计划' : ''}。数据保存在当前浏览器本地，不会上传。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="mr-1 size-3.5" aria-hidden="true" /> 导出数据（JSON）
          </Button>
          <Button variant="outline" size="sm" onClick={() => { loadSample(); toast.success('已载入熬夜型示例数据'); }}>
            <Sparkles className="mr-1 size-3.5" aria-hidden="true" /> 载入示例数据
          </Button>
          <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
            <Trash2 className="mr-1 size-3.5" aria-hidden="true" /> 删除全部数据
          </Button>
          {demo && <Badge variant="secondary">当前为示例数据</Badge>}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        隐私说明：睡眠数据属于敏感个人信息。当前版本的数据只存在本机浏览器，换设备或换浏览器不会同步；清除浏览器数据会一并删除记录。要多人共享需要接入服务端，本版本未实现。
      </p>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除全部睡眠数据？</AlertDialogTitle>
            <AlertDialogDescription>
              将清除 {logs.length} 条记录、恢复计划与提醒配置，且无法恢复。建议先导出一份备份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAll();
                setClearOpen(false);
                toast.success('数据已清空');
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除当前账号？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除账号「{current?.name ?? ''}」及其名下的 {logs.length} 条记录、恢复计划与设置，且无法恢复。
              其他账号的数据不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={removeCurrentAccount}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
