import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, Lightbulb, Table2 } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import RhythmBand from '@/components/RhythmBand';
import { useSleepApp } from '@/hooks/useSleepApp';
import { formatDateShort, weekdayLabel } from '@/lib/date';
import {
  aggregateMetrics,
  disruptionCheck,
  factorInsight,
  logDerived,
  midpointOffset,
  recentLogs,
  bedtimeOffset,
  toMinutes,
} from '@/lib/sleep';
import { formatDuration, formatHoursShort, formatPercent } from '@/lib/format';
import { CHART } from '@/lib/chartColors';

interface IMetricTileProps {
  label: string;
  value: string;
  hint: string;
}

function MetricTile({ label, value, hint }: IMetricTileProps) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function AnalysisPage() {
  const { settings, logs } = useSleepApp();
  const [range, setRange] = useState<7 | 30>(7);
  const window = recentLogs(logs, range);
  const metrics = aggregateMetrics(window, settings.targetSleepMinutes);
  const disruption = disruptionCheck(logs, settings);
  const insight = factorInsight(logs);
  const targetHours = Math.round((settings.targetSleepMinutes / 60) * 10) / 10;

  const chartData = window.map((log) => ({
    date: formatDateShort(log.date),
    hours: Math.round((logDerived(log).asleep / 60) * 10) / 10,
    efficiency: Math.round(logDerived(log).efficiency * 100),
    target: targetHours,
  }));

  const missing = settings.targetSleepMinutes - metrics.avgAsleep;
  const gapHours = Math.round((metrics.midpointGap / 60) * 10) / 10;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">睡眠分析</h1>
          <p className="mt-1 text-sm text-muted-foreground">先把数据看清楚，再决定下一步改哪一个小习惯。</p>
        </div>
        <div className="flex gap-1.5">
          {([7, 30] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              aria-pressed={range === item}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                range === item
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              近 {item} 天
            </button>
          ))}
        </div>
      </div>

      {metrics.count < 3 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="font-medium">数据不足 3 天</p>
            <p className="text-sm text-muted-foreground">
              目前有 {metrics.count} 条记录。至少记录 3 天才会给出指标与判定，避免用一两天的小波动下结论。
            </p>
            <Button asChild size="sm">
              <Link to="/log">去记录</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <MetricTile
              label="平均睡眠时长"
              value={`${formatHoursShort(metrics.avgAsleep)} 小时`}
              hint={`目标 ${formatHoursShort(settings.targetSleepMinutes)} 小时`}
            />
            <MetricTile
              label="睡眠效率"
              value={formatPercent(metrics.avgEfficiency)}
              hint="实际睡着时间占在床时间"
            />
            <MetricTile label="平均入睡用时" value={`${Math.round(metrics.avgLatency)} 分钟`} hint="上床到睡着" />
            <MetricTile
              label={`${range} 天睡眠债`}
              value={formatDuration(metrics.sleepDebt)}
              hint="按目标时长累计的缺口"
            />
            <MetricTile
              label="入睡时间波动"
              value={`±${Math.round(metrics.bedSd)} 分钟`}
              hint="标准差，越小越规律"
            />
          </div>

          <Card>
            <CardHeader className="gap-1">
              <CardTitle className="text-base">节律带</CardTitle>
              <CardDescription>一眼看出哪天睡得短、哪天睡得太晚。</CardDescription>
            </CardHeader>
            <CardContent>
              <RhythmBand logs={window} settings={settings} />
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="text-base">睡眠时长趋势</CardTitle>
                <CardDescription>虚线为目标 {targetHours} 小时。</CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke={CHART.axis} strokeOpacity={0.18} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={CHART.axis} interval="preserveStartEnd" />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke={CHART.axis} width={40} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <ReferenceLine y={targetHours} stroke={CHART.target} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="hours" name="睡眠时长（小时）" stroke={CHART.line} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="text-base">睡眠效率趋势</CardTitle>
                <CardDescription>一般 85% 以上算比较稳。</CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke={CHART.axis} strokeOpacity={0.18} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={CHART.axis} interval="preserveStartEnd" />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} stroke={CHART.axis} width={40} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <ReferenceLine y={85} stroke={CHART.target} strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="efficiency"
                      name="睡眠效率（%）"
                      stroke={CHART.efficiency}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-1">
              <CardTitle className="text-base">结论与下一步</CardTitle>
              <CardDescription>每条结论都配一个可以立刻做的动作。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">
                    平均每晚睡 {formatHoursShort(metrics.avgAsleep)} 小时
                    {missing > 0 ? `，比目标少 ${formatHoursShort(missing)} 小时。` : '，已达到目标时长。'}
                  </span>
                  <Link to="/settings" className="text-xs text-primary underline-offset-2 hover:underline">
                    调整目标
                  </Link>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">
                    入睡时间波动 ±{Math.round(metrics.bedSd)} 分钟
                    {metrics.bedSd > 90 ? '，稳定性偏弱。' : '，节律相对稳定。'}
                  </span>
                  {(disruption.triggered || metrics.bedSd > 90) && (
                    <Link to="/plan" className="text-xs text-primary underline-offset-2 hover:underline">
                      用恢复计划固定起床
                    </Link>
                  )}
                </div>
                {metrics.midpointGap > 0 && (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">
                      工作日与周末的睡眠中点相差 {gapHours} 小时
                      {metrics.midpointGap > 120 ? '，周末补觉正在把节律往后推。' : '，还在可接受范围。'}
                    </span>
                    <Link to="/plan" className="text-xs text-primary underline-offset-2 hover:underline">
                      看怎么调
                    </Link>
                  </div>
                )}
                {metrics.sleepDebt > 0 && (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">
                      {range} 天累计欠睡 {formatDuration(metrics.sleepDebt)}
                    </span>
                    <Link to="/log" className="text-xs text-primary underline-offset-2 hover:underline">
                      检查哪几天特别短
                    </Link>
                  </div>
                )}
              </div>
              {disruption.triggered && (
                <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm">
                  <span className="font-medium text-warning">已判定为作息失调：</span>
                  {disruption.reasons.map((reason) => reason.label).join('、')}。
                  <Link to="/plan" className="ml-1 text-primary underline-offset-2 hover:underline">
                    启用循序渐进的恢复计划
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {insight.enough && (
            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4 text-primary" aria-hidden="true" /> 可能相关的影响因素
                </CardTitle>
                <CardDescription>样本量足够才展示，用词只表达相关性，不是因果。</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">{insight.text}</CardContent>
            </Card>
          )}

          <Card>
            <Collapsible>
              <CardHeader className="gap-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Table2 className="size-4 text-primary" aria-hidden="true" /> 数据表
                  </CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      展开 / 收起
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CardDescription>图表背后的原始数值，支持屏幕阅读器逐行阅读。</CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="px-0 pt-0">
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {['日期', '上床', '起床', '睡眠', '效率', '入睡用时', '质量'].map((h) => (
                            <TableHead key={h} className="whitespace-nowrap">
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...window].reverse().map((log) => (
                          <TableRow key={log.date}>
                            <TableCell className="whitespace-nowrap">
                              {formatDateShort(log.date)} {weekdayLabel(log.date)}
                            </TableCell>
                            <TableCell className="tabular-nums">{log.bedTime}</TableCell>
                            <TableCell className="tabular-nums">{log.wakeTime}</TableCell>
                            <TableCell className="tabular-nums">{formatHoursShort(logDerived(log).asleep)} h</TableCell>
                            <TableCell className="tabular-nums">{formatPercent(logDerived(log).efficiency)}</TableCell>
                            <TableCell className="tabular-nums">{log.latency} 分</TableCell>
                            <TableCell>{log.quality} / 5</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5" aria-hidden="true" />
        <p>
          以上结论基于手动记录的趋势与区间，不构成医疗诊断。严重或长期症状请就医。
          当前窗口内睡眠中点的相对基准为 04:00，入睡时间基准为 22:00。
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <div>
            <p className="font-medium">想让节律更稳？</p>
            <p className="text-sm text-muted-foreground">
              目标起床 {settings.targetWake}，目标睡眠 {formatDuration(settings.targetSleepMinutes)}。
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">改目标</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/plan">
                恢复计划 <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
