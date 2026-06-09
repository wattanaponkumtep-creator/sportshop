"use client";
import { formatBaht, cn } from "@/lib/utils";

type Series = {
  key: string;
  label: string;
  color: string; // tailwind bg class
  textColor: string;
  values: number[];
};

export function TrendChart({
  labels,
  series,
  yFormatter = formatBaht,
}: {
  labels: string[];
  series: Series[];
  yFormatter?: (n: number) => string;
}) {
  const allValues = series.flatMap((s) => s.values);
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);
  const range = Math.max(maxValue - minValue, 1);

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs">
            <span className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Bars (grouped) */}
      <div className="relative h-44 sm:h-56">
        <div className="absolute inset-0 flex items-end gap-1 sm:gap-2">
          {labels.map((label, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="flex w-full items-end justify-center gap-0.5">
                {series.map((s) => {
                  const v = s.values[i] ?? 0;
                  const heightPct = range > 0 ? ((v - minValue) / range) * 100 : 0;
                  return (
                    <div
                      key={s.key}
                      className={cn("group/bar relative w-full max-w-[14px] rounded-t-sm transition", s.color)}
                      style={{ height: `${Math.max(heightPct, 1)}%` }}
                      title={`${s.label}: ${yFormatter(v)}`}
                    >
                      <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-[10px] opacity-0 shadow-md transition group-hover/bar:opacity-100">
                        {yFormatter(v)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
