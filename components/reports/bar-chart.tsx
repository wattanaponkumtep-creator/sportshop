"use client";
import { cn, formatBaht } from "@/lib/utils";

type Point = { label: string; value: number; secondaryValue?: number };

export function BarChart({
  data,
  title,
  formatValue = formatBaht,
  primaryColor = "bg-orange-500",
  secondaryColor = "bg-emerald-500",
  secondaryLabel,
  primaryLabel,
}: {
  data: Point[];
  title?: string;
  formatValue?: (n: number) => string;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.value, d.secondaryValue ?? 0]));

  return (
    <div className="space-y-4">
      {title && <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>}

      {(primaryLabel || secondaryLabel) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {primaryLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm", primaryColor)} />
              {primaryLabel}
            </span>
          )}
          {secondaryLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm", secondaryColor)} />
              {secondaryLabel}
            </span>
          )}
        </div>
      )}

      <div className="flex h-48 items-end gap-2">
        {data.map((d, i) => {
          const heightPct = (d.value / max) * 100;
          const secondaryHeightPct = d.secondaryValue ? (d.secondaryValue / max) * 100 : 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div className="flex h-full w-full max-w-[24px] items-end">
                  <div
                    className={cn("w-full rounded-t-sm transition-all", primaryColor)}
                    style={{ height: `${heightPct}%`, minHeight: d.value > 0 ? "2px" : "0" }}
                    title={`${d.label}: ${formatValue(d.value)}`}
                  />
                </div>
                {d.secondaryValue !== undefined && (
                  <div className="flex h-full w-full max-w-[24px] items-end">
                    <div
                      className={cn("w-full rounded-t-sm transition-all", secondaryColor)}
                      style={{ height: `${secondaryHeightPct}%`, minHeight: d.secondaryValue > 0 ? "2px" : "0" }}
                      title={`${d.label}: ${formatValue(d.secondaryValue)}`}
                    />
                  </div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
