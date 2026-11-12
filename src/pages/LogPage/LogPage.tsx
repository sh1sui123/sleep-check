import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import type { CaffeineLevel, ISleepLog } from '@/data/types';
import { TODAY, formatDateShort, lastNDates, weekdayLabel } from '@/lib/date';
import { fromMinutes, inBedMinutes, isAbnormal, logDerived, toMinutes } from '@/lib/sleep';
import { formatDuration, formatPercent } from '@/lib/format';

interface ILogDraft {
  date: string;
  bedTime: string;
  wakeTime: string;
  latency: string;
  wakeCount: string;
  wakeMinutes: string;
  quality: number;
  napMinutes: string;
  caffeine: CaffeineLevel;
  screenMinutes: string;
  stress: string;
  note: string;
}

const CAFFEINE_LABEL: Record<CaffeineLevel, string> = {
  none: '没有',
  afternoon: '午后有',
  evening: '晚间有',
};

function defaultDraft(targetWake: string, targetSleepMinutes: number): ILogDraft {
  const wake = toMinutes(targetWake);
  return {
    date: TODAY,
    bedTime: fromMinutes(wake - targetSleepMinutes),
    wakeTime: targetWake,
    latency: '15',
    wakeCount: '1',
    wakeMinutes: '10',
    quality: 3,
    napMinutes: '0',
    caffeine: 'none',
    screenMinutes: '30',
    stress: '3',
    note: '',
  };
}

function draftFromLog(log: ISleepLog): ILogDraft {
  return {
    date: log.date,
    bedTime: log.bedTime,
    wakeTime: log.wakeTime,
    latency: String(log.latency),
    wakeCount: String(log.wakeCount),
    wakeMinutes: String(log.wakeMinutes),
    quality: log.quality,
    napMinutes: String(log.napMinutes),
    caffeine: log.caffeine,
    screenMinutes: String(log.screenMinutes),
    stress: String(log.stress),
    note: log.note,
  };
}

export default function LogPage() {
  const { settings, logs, saveLog, deleteLog } = useSleepApp();
  const days = lastNDates(7);
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const [draft, setDraft] = useState<ILogDraft>(() => defaultDraft(settings.targetWake, settings.targetSleepMinutes));
  const [openOptional, setOpenOptional] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const patch = (next: Partial<ILogDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  const inBed = inBedMinutes(draft.bedTime, draft.wakeTime);
  const asleepEstimate = Math.max(0, inBed - Number(draft.latency || 0) - Number(draft.wakeMinutes || 0));

  const selectDate = (date: string) => {
    const existing = byDate.get(date);
    setDraft(existing ? draftFromLog(existing) : { ...defaultDraft(settings.targetWake, settings.targetSleepMinutes), date });
    setOpenOptional(Boolean(existing && (existing.caffeine !== 'none' || existing.napMinutes > 0 || existing.note)));
  };

  const commit = () => {
    const log: ISleepLog = {
      date: draft.date,
      bedTime: draft.bedTime,
      wakeTime: draft.wakeTime,
      latency: Math.max(0, Number(draft.latency) || 0),
      wakeCount: Math.max(0, Number(draft.wakeCount) || 0),
      wakeMinutes: Math.max(0, Number(draft.wakeMinutes) || 0),
      quality: draft.quality,
      napMinutes: Math.max(0, Number(draft.napMinutes) || 0),
      caffeine: draft.caffeine,
      screenMinutes: Math.max(0, Number(draft.screenMinutes) || 0),
      stress: Math.max(0, Number(draft.stress) || 0),
      note: draft.note,
      updatedAt: TODAY,
    };
    saveLog(log);
    setConfirmOpen(false);
    toast.success(`${formatDateShort(log.date)} 的记录已保存`);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (inBed === 0) {
      toast.error('起床时间要晚于上床时间，请检查一下');
      return;
    }
    if (isAbnormal(draft)) {
      setConfirmOpen(true);
      return;
    }
    commit();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">记录睡眠</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          只需必填项，1 分钟内完成。默认值取自你的目标作息，可直接保存。
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {days.map((date) => {
          const recorded = byDate.has(date);
          const active = draft.date === date;
          return (
            <button
              key={date}
              type="button"
              onClick={() => selectDate(date)}
              className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {formatDateShort(date)} {weekdayLabel(date)}
              {recorded ? <Check className="ml-1 inline size-3" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">填写 {formatDateShort(draft.date)} 的睡眠</CardTitle>
          <CardDescription>跨零点、午睡都会被正确计算。日期取起床当天。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date">起床日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={draft.date}
                  min={days[0]}
                  max={days[days.length - 1]}
                  onChange={(e) => patch({ date: e.target.value })}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bedTime">上床时间</Label>
                <Input
                  id="bedTime"
                  type="time"
                  value={draft.bedTime}
                  onChange={(e) => patch({ bedTime: e.target.value })}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wakeTime">起床时间</Label>
                <Input
                  id="wakeTime"
                  type="time"
                  value={draft.wakeTime}
                  onChange={(e) => patch({ wakeTime: e.target.value })}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="latency">入睡用时（分钟）</Label>
                <Input
                  id="latency"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={300}
                  value={draft.latency}
                  onChange={(e) => patch({ latency: e.target.value })}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wakeCount">夜间醒来次数</Label>
                <Input
                  id="wakeCount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={20}
                  value={draft.wakeCount}
                  onChange={(e) => patch({ wakeCount: e.target.value })}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wakeMinutes">夜间清醒总时长（分钟）</Label>
                <Input
                  id="wakeMinutes"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={600}
                  value={draft.wakeMinutes}
                  onChange={(e) => patch({ wakeMinutes: e.target.value })}
                  className="h-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>主观睡眠质量</Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patch({ quality: n })}
                    aria-pressed={draft.quality === n}
                    className={`h-11 flex-1 rounded-md border text-sm transition-colors ${
                      draft.quality === n
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {n} 分
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              预计睡眠时长 <span className="font-medium tabular-nums">{formatDuration(asleepEstimate)}</span>
              <span className="text-muted-foreground">
                {' '}
                · 在床 {formatDuration(inBed)} · 效率{' '}
                {formatPercent(inBed > 0 ? asleepEstimate / inBed : 0)}
              </span>
            </div>

            <Collapsible open={openOptional} onOpenChange={setOpenOptional}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="-ml-2">
                  {openOptional ? '收起选填项' : '展开选填项（咖啡因、午睡、屏幕、压力）'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 grid gap-4 rounded-md border border-border p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nap">午睡时长（分钟）</Label>
                  <Input
                    id="nap"
                    type="number"
                    min={0}
                    max={300}
                    value={draft.napMinutes}
                    onChange={(e) => patch({ napMinutes: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="caffeine">咖啡因摄入</Label>
                  <div className="flex gap-1.5" id="caffeine">
                    {(['none', 'afternoon', 'evening'] as CaffeineLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => patch({ caffeine: level })}
                        aria-pressed={draft.caffeine === level}
                        className={`h-11 flex-1 rounded-md border text-sm ${
                          draft.caffeine === level
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {CAFFEINE_LABEL[level]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="screen">睡前屏幕使用（分钟）</Label>
                  <Input
                    id="screen"
                    type="number"
                    min={0}
                    max={600}
                    value={draft.screenMinutes}
                    onChange={(e) => patch({ screenMinutes: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stress">压力水平（1 低 - 5 高）</Label>
                  <Input
                    id="stress"
                    type="number"
                    min={1}
                    max={5}
                    value={draft.stress}
                    onChange={(e) => patch({ stress: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="note">备注</Label>
                  <Textarea
                    id="note"
                    value={draft.note}
                    onChange={(e) => patch({ note: e.target.value })}
                    placeholder="例如：加班到 23 点、睡前看了两小时手机"
                    rows={2}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={inBed === 0}>
                保存记录
              </Button>
              <Button type="button" variant="ghost" onClick={() => selectDate(draft.date)}>
                恢复默认值
              </Button>
              {draft.date !== TODAY && <span className="text-xs text-muted-foreground">这是一条补录记录</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">最近 7 天</CardTitle>
          <CardDescription>可以直接点击记录修改，修改后指标会重新计算。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">还没有任何记录，先保存上面这一条。</p>}
          {[...days].reverse().map((date) => {
            const log = byDate.get(date);
            if (!log) {
              return (
                <div key={date} className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {formatDateShort(date)} {weekdayLabel(date)} · 未记录
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => selectDate(date)}>
                    补录
                  </Button>
                </div>
              );
            }
            return (
              <div key={date} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-3 py-2 text-sm">
                <span className="w-24 shrink-0 tabular-nums">
                  {formatDateShort(date)} {weekdayLabel(date)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {log.bedTime} - {log.wakeTime}
                </span>
                <Badge variant="secondary" className="tabular-nums">
                  睡 {formatDuration(logDerived(log).asleep)}
                </Badge>
                <span className="tabular-nums text-muted-foreground">效率 {formatPercent(logDerived(log).efficiency)}</span>
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => selectDate(date)} aria-label={`修改 ${date} 的记录`}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteLog(date);
                      toast.success(`${formatDateShort(date)} 的记录已删除`);
                    }}
                    aria-label={`删除 ${date} 的记录`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>这条记录看起来不太常见</AlertDialogTitle>
            <AlertDialogDescription>
              在床时间 {formatDuration(inBed)}，超出 1 至 16 小时的常见范围。请确认时间没有填错，仍然要保存吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回检查</AlertDialogCancel>
            <AlertDialogAction onClick={commit}>仍然保存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
