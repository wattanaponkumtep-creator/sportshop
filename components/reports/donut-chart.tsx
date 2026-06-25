"use client";
import { formatBaht, cn } from "@/lib/utils";

export type DonutSlice = {
  label: string;
  value: number;
  color: string; // hex
};

export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel?: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);

  if (total <= 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-dashed border-border" />
        ยังไม่มีข้อมูล
      </div>
    );
  }

  // Build conic-gradient stops
  let acc = 0;
  const stops: string[] = [];
  for (const s of slices) {
    const startPct = (acc / total) * 100;
    acc += s.value;
    const endPct = (acc / total) * 100;
    stops.push(`${s.color} ${startPct}% ${endPct}%`);
  }
  const gradient = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      {/* Donut */}
      <div className="relative h-36 w-36 shrink-0">
        <div className="h-full w-full rounded-full" style={{ background: gradient }} />
        {/* Center hole */}
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-card text-center">
          <span className="text-[10px] text-muted-foreground">{centerLabel ?? "รวม"}</span>
          <span className="font-mono text-sm font-bold leading-tight">{formatBaht(total)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {slices.map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <div key={s.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="shrink-0 font-mono tabular-nums">
                {formatBaht(s.value)}
                <span className="ml-1.5 text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
