import { Link } from 'react-router-dom';
import { ArrowRight, Bell, CalendarDays, ClipboardCheck, Info, Moon, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RhythmBand from '@/components/RhythmBand';
import { useSleepApp } from '@/hooks/useSleepApp';
import { TODAY, formatDateCN, formatDateShort, parseISODay, shiftDate, weekdayLabel, NOW_TIME } from '@/lib/date';
import { aggregateMetrics, disruptionCheck, logDerived, planToday, recentLogs, toMinutes } from '@/lib/sleep';
import { formatDuration, formatPercent, greeting } from '@/lib/format';

function QualityDots({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`主观质量 ${value} 分（满分 5 分）`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-2 rounded-full ${n <= value ? 'bg-primary' : 'bg-muted-foreground/25'}`} />
      ))}
    </span>
  );
}

export default function HomePage() {
  const { settings, logs, plan, demo, snoozeUntil, snoozeDisruption } = useSleepApp();
  const todayLog = logs.find((l) => l.date === TODAY);
  const recent = recentLogs(logs, 7);
  const metrics = aggregateMetrics(recent, settings.targetSleepMinutes);
  const disruption = disruptionCheck(logs, settings);
  const snoozed = snoozeUntil > TODAY;
  const activePlan = plan && plan.status === 'active' ? plan : null;
  const todayPlanDay = activePlan ? planToday(activePlan) : null;
  const reminderDue =
    !todayLog &&
    settings.channels.inApp &&
    settings.reminderDays.includes(parseISODay(TODAY)) &&
    toMinutes(NOW_TIME) >= toMinutes(settings.recordReminder);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {greeting()}，今天是 {formatDateCN(TODAY)} {weekdayLabel(TODAY)}
          </p>
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">今天睡得怎么样</h1>
        </div>
        {demo && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3" aria-hidden="true" /> 示例数据
          </Badge>
        )}
      </div>

      {demo && (
        <p className="rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          当前展示的是「熬夜型」示例数据（近 21 天），用于体验分析与失调判定。记录自己的数据后会自动切换为真实数据，也可到「我的」里清空。
        </p>
      )}

      <Card>
        <CardHeader className="gap-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="size-4 text-primary" aria-hidden="true" /> 昨夜睡眠
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/log">{todayLog ? '修改记录' : '去记录'}</Link>
            </Button>
          </div>
          <CardDescription>每条记录对应一个起床日，默认带上目标作息。</CardDescription>
        </CardHeader>
        <CardContent>
          {todayLog ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="font-serif text-4xl font-semibold tabular-nums">
                    {formatDuration(logDerived(todayLog).asleep)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    在床 {formatDuration(logDerived(todayLog).inBed)} · 目标 {formatDuration(settings.targetSleepMinutes)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">睡眠效率</dt>
                    <dd className="tabular-nums">{formatPercent(logDerived(todayLog).efficiency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">入睡用时</dt>
                    <dd className="tabular-nums">{todayLog.latency} 分钟</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">夜醒</dt>
                    <dd className="tabular-nums">
                      {todayLog.wakeCount} 次 / {todayLog.wakeMinutes} 分钟
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">主观质量</dt>
                    <dd className="pt-0.5">
                      <QualityDots value={todayLog.quality} />
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-sm text-muted-foreground">
                上床 {todayLog.bedTime}，起床 {todayLog.wakeTime}。
                {metrics.sleepDebt > 0 && ` 近 7 天累计睡眠债约 ${formatDuration(metrics.sleepDebt)}。`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border bg-muted/40 p-4">
              <p className="text-sm">还没有今天（{formatDateCN(TODAY)}）的记录。填一次大约 1 分钟。</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/log">记录昨晚</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/log">补录最近 7 天</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {reminderDue && (
        <div className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3">
          <Bell className="mt-0.5 size-4 text-primary" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">记录提醒：{settings.recordReminder}</p>
            <p className="text-muted-foreground">今天还没记录，补一条能让分析保持准确。</p>
          </div>
          <Button asChild size="sm" variant="outline" className="ml-auto shrink-0">
            <Link to="/log">去记录</Link>
          </Button>
        </div>
      )}

      {disruption.triggered && !snoozed && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="gap-1">
            <CardTitle className="text-base text-warning">作息有点乱，可以帮你调回来</CardTitle>
            <CardDescription>
              基于近 {disruption.sampleDays} 天记录判定{disruption.severity === 'high' ? '（两项以上指标同时偏离）' : ''}。这不是诊断，只是一次提醒。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5 text-sm">
              {disruption.reasons.map((reason) => (
                <li key={reason.code} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{reason.label}</span>
                    <span className="text-muted-foreground"> — {reason.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/plan">启用恢复计划</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => snoozeDisruption(shiftDate(TODAY, 3))}>
                暂不处理（3 天内不再提醒）
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {disruption.triggered && snoozed && (
        <p className="text-xs text-muted-foreground">
          已暂时忽略失调提醒，{formatDateShort(snoozeUntil)} 之后会重新评估。想立刻调整可随时去
          <Link to="/plan" className="mx-1 text-primary underline-offset-2 hover:underline">
            恢复计划
          </Link>
          。
        </p>
      )}

      {activePlan && (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-4 text-primary" aria-hidden="true" /> 今天的计划
            </CardTitle>
            <CardDescription>
              第 {Math.min(todayPlanDay?.index ?? 1, activePlan.days.length)} / {activePlan.days.length} 天 ·{' '}
              {todayPlanDay ? `目标 ${todayPlanDay.targetBed} 上床 / ${todayPlanDay.targetWake} 起床` : '今天不在计划区间内'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            {todayPlanDay ? (
              <p className="text-sm text-muted-foreground">
                {todayPlanDay.checkedIn
                  ? `今天已打卡，完成 ${todayPlanDay.done.length} / ${todayPlanDay.tasks.length} 项任务。`
                  : `今天还有 ${todayPlanDay.tasks.length} 项任务待打卡。`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">计划从 {formatDateShort(activePlan.startDate)} 开始，还没轮到今天。</p>
            )}
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link to="/plan">
                去打卡 <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" /> 近 7 天节律
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/analysis">
                完整分析 <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <CardDescription>横条是在床时段，竖线是目标起床时间。</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有记录，先填一条就能看到自己的节律。</p>
          ) : (
            <>
              <RhythmBand logs={recent} settings={settings} />
              {recent.length < 3 && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="size-3.5" aria-hidden="true" /> 数据不足 3 天，暂不做失调判定。
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        安睡管家不提供医疗诊断。若长期严重失眠、白天嗜睡影响驾驶或工作，请优先就医。
      </p>
    </div>
  );
}
