import type { ISleepLog, IUserSettings } from '@/data/types';
import { formatDateShort, weekdayLabel } from '@/lib/date';
import { inBedMinutes, logDerived, toMinutes } from '@/lib/sleep';
import { cn } from '@/lib/utils';

interface RhythmBandProps {
  logs: ISleepLog[];
  settings: IUserSettings;
  showAxis?: boolean;
  dense?: boolean;
}

const AXIS_START = 18 * 60;
const AXIS_MINUTES = 1440;

function offsetFromAxis(minutes: number): number {
  return ((minutes - AXIS_START) % AXIS_MINUTES + AXIS_MINUTES) % AXIS_MINUTES;
}

export default function RhythmBand({ logs, settings, showAxis = true, dense = false }: RhythmBandProps) {
  const targetX = (offsetFromAxis(toMinutes(settings.targetWake)) / AXIS_MINUTES) * 100;
  const rows = [...logs].reverse();

  return (
    <div className="w-full">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-chart-2"
          style={{ left: `calc(${targetX}% + 4.5rem)` }}
          aria-hidden="true"
        />
        <div className="space-y-1.5">
          {rows.map((log) => {
            const inBed = inBedMinutes(log.bedTime, log.wakeTime);
            const derived = logDerived(log);
            const start = offsetFromAxis(toMinutes(log.bedTime));
            const width = Math.min(Math.max((inBed / AXIS_MINUTES) * 100, 1.6), 100 - (start / AXIS_MINUTES) * 100);
            const mid = (start + inBed / 2) / AXIS_MINUTES * 100;
            const short = settings.targetSleepMinutes - derived.asleep > 90;
            return (
              <div key={log.date} className={cn('flex items-center gap-3', dense ? 'text-[11px]' : 'text-xs')}>
                <div className="flex w-16 shrink-0 items-baseline gap-1 tabular-nums text-muted-foreground">
                  <span>{formatDateShort(log.date)}</span>
                  <span className={cn('text-[10px]', dense && 'hidden')}>{weekdayLabel(log.date)}</span>
                </div>
                <div className={cn('relative flex-1 rounded-sm bg-muted', dense ? 'h-4' : 'h-6')}>
                  <div
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 rounded-full',
                      short ? 'bg-destructive/75' : 'bg-primary/70',
                      dense ? 'h-2' : 'h-3',
                    )}
                    style={{ left: `${(start / AXIS_MINUTES) * 100}%`, width: `${width}%` }}
                  />
                  <span
                    className={cn('absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-2', dense && 'size-1')}
                    style={{ left: `${mid}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {showAxis && (
        <div className="mt-3 flex items-center gap-3">
          <div className="w-16 shrink-0" />
          <div className="relative flex-1 border-t border-border pt-1 text-[10px] tabular-nums text-muted-foreground">
            {['18:00', '00:00', '06:00', '12:00'].map((tick, i) => (
              <span
                key={tick}
                className="absolute -translate-x-1/2"
                style={{ left: `${(i / 4) * 100}%` }}
              >
                {tick}
              </span>
            ))}
            <span className="invisible">占位</span>
          </div>
        </div>
      )}
      <div className={cn('mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground', !showAxis && 'mt-2')}>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-primary/70" aria-hidden="true" />
          在床时段
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-chart-2" aria-hidden="true" />
          睡眠中点
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-destructive/75" aria-hidden="true" />
          明显不足
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-chart-2" aria-hidden="true" />
          目标起床 {settings.targetWake}
        </span>
      </div>
      <p className="sr-only">
        共 {rows.length} 条记录，目标起床时间 {settings.targetWake}。
        {rows.map((log) => ` ${log.date} 上床 ${log.bedTime}，起床 ${log.wakeTime}，睡眠 ${Math.round(logDerived(log).asleep / 60 * 10) / 10} 小时。`)}
      </p>
    </div>
  );
}
