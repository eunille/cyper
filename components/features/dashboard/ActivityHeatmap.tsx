/* Full-year activity heatmap — month labels below, day labels left */

const WEEKS = 53;
const DAYS = 7;

// Only show Mon / Wed / Fri labels (index 1, 3, 5 — 0=Sun)
const DAY_LABEL_MAP: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };

// Single-color intensity scale — black/white theme
const CELL = [
  'bg-neutral-100 ring-1 ring-inset ring-neutral-200', // 0 — empty
  'bg-neutral-400',                                     // 1
  'bg-neutral-600',                                     // 2
  'bg-neutral-900',                                     // 3+
] as const;

function toLevel(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

interface Props {
  /** dateString (Date.toDateString()) → session count */
  data: Record<string, number>;
}

export function ActivityHeatmap({ data }: Props) {
  const today = new Date();
  const year = today.getFullYear();

  // Start from the Sunday on or before Jan 1 of the current year
  const jan1 = new Date(year, 0, 1);
  const start = new Date(jan1);
  start.setDate(jan1.getDate() - jan1.getDay()); // rewind to Sunday

  // End on the Saturday on or after Dec 31
  const dec31 = new Date(year, 11, 31);
  const end = new Date(dec31);
  end.setDate(dec31.getDate() + (6 - dec31.getDay())); // forward to Saturday

  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  // Build week columns: weeks[col][row]
  const weeks = Array.from({ length: totalWeeks }, (_, wi) =>
    Array.from({ length: DAYS }, (_, di) => {
      const d = new Date(start);
      d.setDate(start.getDate() + wi * DAYS + di);
      return { date: d, count: data[d.toDateString()] ?? 0 };
    }),
  );

  // Build month markers: { weekIndex, label } for each month that starts in this year
  const monthMarkers: { weekIndex: number; label: string }[] = [];
  weeks.forEach((week, wi) => {
    const has1st = week.find((c) => c.date.getDate() === 1 && c.date.getFullYear() === year);
    if (has1st) {
      monthMarkers.push({
        weekIndex: wi,
        label: has1st.date.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
  });

  return (
    <div className="w-full">
      {/* Main grid: day-labels col + week columns filling full width */}
      <div className="flex w-full gap-1">
        {/* Day-of-week labels */}
        <div className="flex shrink-0 flex-col gap-[3px]">
          {Array.from({ length: DAYS }, (_, i) => (
            <div
              key={i}
              className="flex h-[11px] w-6 items-center justify-end pr-1 text-[9px] text-neutral-400"
            >
              {DAY_LABEL_MAP[i] ?? ''}
            </div>
          ))}
        </div>

        {/* Week columns — CSS grid, auto-fills container width */}
        <div
          className="grid flex-1 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${totalWeeks}, 1fr)` }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={`${cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`}
                  className={`aspect-square w-full rounded-[2px] ${CELL[toLevel(cell.count)]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Month labels — positioned proportionally using flex spacers */}
      <div className="mt-1.5 flex w-full pl-7">
        {monthMarkers.map((marker, idx) => {
          const nextIdx = idx + 1 < monthMarkers.length ? monthMarkers[idx + 1].weekIndex : totalWeeks;
          const span = nextIdx - marker.weekIndex;
          return (
            <div
              key={marker.label}
              className="text-[9px] text-neutral-400 whitespace-nowrap"
              style={{ flex: span }}
            >
              {marker.label}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 pl-7">
        <span className="text-[9px] text-neutral-400">Less</span>
        {CELL.map((cls, i) => (
          <div key={i} className={`h-[9px] w-[9px] rounded-sm ${cls}`} />
        ))}
        <span className="text-[9px] text-neutral-400">More</span>
      </div>
    </div>
  );
}
