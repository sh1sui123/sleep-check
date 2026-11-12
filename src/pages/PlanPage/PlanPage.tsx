import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Pause, Play, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import type { IRecoveryPlan } from '@/data/types';
import { TODAY, formatDateShort, weekdayLabel } from '@/lib/date';
import {
  checkinPlanDay,
  disruptionCheck,
  fromMinutes,
  generatePlan,
  paceAdjustment,
  planToday,
  rebuildPlan,
  recentLogs,
  resumePlan,
  reviewPlan,
  toMinutes,
  wrapSigned,
} from '@/lib/sleep';
import { formatDuration, formatHoursShort } from '@/lib/format';

const STATUS_LABEL: Record<IRecoveryPlan['status'], string> = {
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
  terminated: '已终止',
};

export default function PlanPage() {
  const { settings, logs, plan, updateSettings, savePlan } = useSleepApp();
  const [showForm, setShowForm] = useState(false);
  const [targetWake, setTargetWake] = useState(settings.targetWake);
  const [step, setStep] = useState(settings.paceStep);
  const [termOpen, setTermOpen] = useState(false);
  const [draftDone, setDraftDone] = useState<string[] | null>(null);

  const disruption = disruptionCheck(logs, settings);
  const todayPlanDay = plan && plan.status === 'active' ? planToday(plan) : null;
  const avg = recentLogs(logs, 7);
  const avgWakeMinutes = avg.length ? Math.round(avg.reduce((sum, l) => sum + toMinutes(l.wakeTime), 0) / avg.length) : 0;
  const avgWakeLabel = avgWakeMinutes ? fromMinutes(avgWakeMinutes) : '—';
  const needMinutes = avgWakeMinutes ? Math.abs(wrapSigned(avgWakeMinutes - toMinutes(targetWake))) : 0;
  const estimateDays = Math.min(28, Math.max(7, Math.ceil(needMinutes / step)));

  const activeDone = draftDone ?? todayPlanDay?.done ?? [];

  const generate = () => {
    const next = generatePlan(logs, settings, step, targetWake);
    savePlan(next);
    updateSettings({ targetWake, paceStep: step });
    setDraftDone(null);
    toast.success(`已生成 ${next.days.length} 天计划，明天开始`);
  };

  const toggleTask = (id: string) => {
    if (!todayPlanDay) return;
    const base = draftDone ?? todayPlanDay.done;
    setDraftDone(base.includes(id) ? base.filter((t) => t !== id) : [...base, id]);
  };

  const submitCheckin = () => {
    if (!plan || !todayPlanDay) return;
    const checked = checkinPlanDay(plan, todayPlanDay.date, activeDone);
    setDraftDone(null);
    const qualified = activeDone.length >= 2;
    const adj = paceAdjustment(checked);
    if (adj.action !== 'none' && checked.status === 'active') {
      const rebuilt = rebuildPlan(checked, adj.step, adj.note);
      savePlan(rebuilt);
      toast.info(adj.note);
      return;
    }
    savePlan(checked);
    toast.success(qualified ? '今天完成得不错，已记录打卡' : '打卡已记录，没做到的明天再试');
  };

  const needsDisclaimer = !settings.disclaimerAccepted;
  const planFinished = plan && (plan.status === 'completed' || plan.status === 'terminated');
  const formVisible = showForm || !plan || planFinished;
  const review = plan ? reviewPlan(plan, logs) : null;
  const progress = plan ? Math.round((plan.days.filter((d) => d.checkedIn).length / plan.days.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">恢复计划</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          每天只挪 15-30 分钟，循序渐进地把作息调回来。计划不追求快，追求能坚持。
        </p>
      </div>

      {plan && !planFinished && (
        <Card>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="size-4 text-primary" aria-hidden="true" /> {plan.days.length} 天计划
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={plan.status === 'active' ? 'default' : plan.status === 'paused' ? 'secondary' : 'outline'}>
                  {STATUS_LABEL[plan.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">每日 {plan.step} 分钟</span>
              </div>
            </div>
            <CardDescription>
              起点起床 {plan.startWake} → 目标 {plan.targetWake} / {plan.targetBed} 上床。已完成{' '}
              {plan.days.filter((d) => d.checkedIn).length} / {plan.days.length} 天。
            </CardDescription>
            <Progress value={progress} className="mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.note && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{plan.note}</p>}
            {plan.paceNote && (
              <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">{plan.paceNote}</p>
            )}

            {plan.status === 'paused' ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-3 py-3">
                <p className="text-sm text-muted-foreground">计划已暂停，进度保留。恢复后从今天接着往下走。</p>
                <Button size="sm" onClick={() => { savePlan(resumePlan(plan)); toast.success('已恢复计划'); }}>
                  <Play className="mr-1 size-3.5" aria-hidden="true" /> 恢复计划
                </Button>
              </div>
            ) : todayPlanDay ? (
              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">今天 · 第 {todayPlanDay.index} 天</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    目标 {todayPlanDay.targetBed} 上床 / {todayPlanDay.targetWake} 起床
                  </p>
                </div>
                <div className="space-y-2">
                  {todayPlanDay.tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent/40"
                    >
                      <Checkbox
                        checked={activeDone.includes(task.id)}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-sm font-medium">{task.label}</span>
                        <span className="block text-xs text-muted-foreground">{task.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={submitCheckin}>
                    保存今天的打卡
                  </Button>
                  <span className="text-xs text-muted-foreground">完成 2 项及以上视为达标；连续 2 天未达标会自动放缓。</span>
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                {plan.startDate > TODAY
                  ? `计划从 ${formatDateShort(plan.startDate)} 开始，今天还没有任务。`
                  : '今天不在计划区间内，可以看下方日程。'}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {plan.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    savePlan({ ...plan, status: 'paused' });
                    toast.success('已暂停，进度已保留');
                  }}
                >
                  <Pause className="mr-1 size-3.5" aria-hidden="true" /> 暂停
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setTermOpen(true)}>
                <XCircle className="mr-1 size-3.5" aria-hidden="true" /> 终止计划
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
                <RotateCcw className="mr-1 size-3.5" aria-hidden="true" /> 重新生成
              </Button>
            </div>

            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {plan.days.map((day) => {
                const isToday = day.date === TODAY;
                return (
                  <div
                    key={day.date}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm ${
                      isToday ? 'border-primary/50 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">
                      第 {day.index} 天
                    </span>
                    <span className="w-24 shrink-0 tabular-nums">
                      {formatDateShort(day.date)} {weekdayLabel(day.date)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {day.targetBed} - {day.targetWake}
                    </span>
                    {day.checkedIn ? (
                      <Badge variant={day.done.length >= 2 ? 'default' : 'secondary'} className="ml-auto">
                        {day.done.length >= 2 ? '已达标' : '未达标'} {day.done.length}/{day.tasks.length}
                      </Badge>
                    ) : (
                      <span className="ml-auto text-xs text-muted-foreground">{isToday ? '今天' : day.date < TODAY ? '已跳过' : '待执行'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {formVisible && (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">生成新的恢复计划</CardTitle>
            <CardDescription>
              {disruption.triggered
                ? `当前判定：${disruption.reasons.map((r) => r.label).join('、')}。`
                : '没有触发失调判定，也可以主动调一次作息。'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              近 7 天平均起床 {avgWakeLabel}；目标睡眠 {formatDuration(settings.targetSleepMinutes)}。
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="targetWake">目标起床时间</Label>
                <Input
                  id="targetWake"
                  type="time"
                  value={targetWake}
                  onChange={(e) => setTargetWake(e.target.value || settings.targetWake)}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label>每天调整幅度</Label>
                <div className="flex gap-1.5">
                  {[15, 20, 30].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setStep(v)}
                      aria-pressed={step === v}
                      className={`h-11 flex-1 rounded-md border text-sm ${
                        step === v
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {v} 分钟
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              按当前平均起床时间估算，预计需要 <span className="font-medium text-foreground">{estimateDays} 天</span>
              {needMinutes > 14 * step && '（调整跨度较大，计划会自动延长并说明原因）'}。
            </p>

            {needsDisclaimer && (
              <div className="space-y-3 rounded-md border border-warning/40 bg-warning/5 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-warning">
                  <ShieldAlert className="size-4" aria-hidden="true" /> 使用前请先确认健康声明
                </p>
                <p className="text-xs text-muted-foreground">
                  安睡管家不提供医疗诊断，也不替代医生。计划基于通用睡眠卫生与节律调整原则，出现长期严重失眠、白天嗜睡影响驾驶等情况请优先就医。
                </p>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={settings.disclaimerAccepted}
                    onCheckedChange={(checked) => updateSettings({ disclaimerAccepted: checked === true })}
                    className="mt-0.5"
                  />
                  我已阅读并理解，本产品不提供医疗诊断
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={generate} disabled={needsDisclaimer}>
                生成计划
              </Button>
              {plan && (
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  返回当前计划
                </Button>
              )}
            </div>
            {plan && !planFinished && !showForm && (
              <p className="text-xs text-muted-foreground">同一时间只能有一个进行中的计划，重新生成会覆盖当前计划。</p>
            )}
          </CardContent>
        </Card>
      )}

      {plan && review && (plan.status === 'completed' || plan.status === 'terminated' || showForm) && (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> 复盘
            </CardTitle>
            <CardDescription>
              计划前 {review.beforeSd ? Math.round(review.beforeSd) : '—'} 分钟波动 → 计划后{' '}
              {review.afterSd ? Math.round(review.afterSd) : '—'} 分钟波动。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {review.hasData ? (
              <>
                <p>{review.summary}</p>
                <p className="text-muted-foreground">
                  计划期平均睡眠 {formatHoursShort(review.afterAsleep)} 小时（此前 {formatHoursShort(review.beforeAsleep)} 小时），
                  完成打卡 {review.completedDays} / {review.totalDays} 天。
                </p>
                <p className="text-muted-foreground">
                  下一步：把固定起床时间再守住两周，周末补觉控制在 1 小时以内；如果波动又超过 90 分钟，再开一轮计划。
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">{review.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {!settings.disclaimerAccepted && (
        <p className="text-xs text-muted-foreground">
          尚未确认健康声明，计划功能会保持锁定。也可以先去
          <Link to="/log" className="mx-1 text-primary underline-offset-2 hover:underline">
            记录睡眠
          </Link>
          继续积累数据。
          如果调整后仍无改善，请到 <Link to="/settings" className="text-primary underline-offset-2 hover:underline">我的</Link> 查看就医提示。
        </p>
      )}

      <AlertDialog open={termOpen} onOpenChange={setTermOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定终止当前计划？</AlertDialogTitle>
            <AlertDialogDescription>
              终止后进度不会保留，需要重新生成。如果只是暂时做不到，建议先暂停。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (plan) {
                  savePlan({ ...plan, status: 'terminated' });
                  toast.success('计划已终止');
                }
                setTermOpen(false);
              }}
            >
              确认终止
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
