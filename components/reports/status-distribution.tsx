"use client";
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function StatusDistribution({ data }: { data: Record<JobStatus, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-center text-muted-foreground py-8">ยังไม่มีข้อมูล</p>;

  const entries = (Object.entries(data) as [JobStatus, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {entries.map(([status, count]) => {
        const pct = (count / total) * 100;
        return (
          <div key={status} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{JOB_STATUS_LABEL[status]}</span>
              <span className="tabular-nums text-muted-foreground">
                {count} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", JOB_STATUS_COLOR[status])}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
