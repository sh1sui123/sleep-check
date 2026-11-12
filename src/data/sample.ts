// EXPORTS: buildSampleLogs

import { addDays, format, parseISO, subDays } from 'date-fns';
import type { ISleepLog } from '@/data/types';
import { TODAY } from '@/lib/date';

/** 熬夜型示例数据：工作日睡不足、周末补觉，用于演示分析与失调判定 */
export function buildSampleLogs(): ISleepLog[] {
  const out: ISleepLog[] = [];
  const end = format(subDays(parseISO(TODAY), 1), 'yyyy-MM-dd');
  for (let i = 20; i >= 0; i -= 1) {
    const date = format(addDays(parseISO(end), -i), 'yyyy-MM-dd');
    const weekend = [0, 6].includes(parseISO(date).getDay());
    const bedBase = 23 * 60 + 50 + ((i * 23) % 70); // 23:50 - 01:00
    const bed = bedBase + (weekend ? 90 : 0);
    const inBed = 6 * 60 + ((i * 17) % 40) + (weekend ? 190 : 0);
    const wake = bed + inBed;
    out.push({
      date,
      bedTime: `${String(Math.floor((bed % 1440) / 60)).padStart(2, '0')}:${String(bed % 60).padStart(2, '0')}`,
      wakeTime: `${String(Math.floor((wake % 1440) / 60)).padStart(2, '0')}:${String(wake % 60).padStart(2, '0')}`,
      latency: 28 + ((i * 7) % 22),
      wakeCount: 1 + (i % 2),
      wakeMinutes: 12 + ((i * 11) % 20),
      quality: weekend ? 3 : 2 + (i % 2),
      napMinutes: weekend ? 45 : 0,
      caffeine: i % 3 === 0 ? 'evening' : i % 3 === 1 ? 'afternoon' : 'none',
      screenMinutes: 45 + ((i * 13) % 60),
      stress: weekend ? 2 : 3 + (i % 2),
      note: '',
      updatedAt: date,
    });
  }
  return out;
}
