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
  const range = Math.max(maxValue, 1); // bars grow from 0
  const hasAnyData = allValues.some((v) => v !== 0);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", s.color)} />
            {s.label}
          </span>
        ))}
      </div>

      {!hasAnyData ? (
        <p className="rounded-md border border-dashed border-border bg-card/40 py-10 text-center text-xs text-muted-foreground">
          ยังไม่มีข้อมูลในช่วง 6 เดือน
        </p>
      ) : (
        <div className="flex h-48 items-end gap-2">
          {labels.map((label, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                {series.map((s) => {
                  const v = s.values[i] ?? 0;
                  const heightPct = (v / range) * 100;
                  return (
                    <div key={s.key} className="flex h-full w-full max-w-[18px] items-end">
                      <div
                        className={cn("w-full rounded-t-sm transition-all", s.color)}
                        style={{ height: `${heightPct}%`, minHeight: v > 0 ? "2px" : "0" }}
                        title={`${label} · ${s.label}: ${yFormatter(v)}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
