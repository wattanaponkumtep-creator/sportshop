"use client";
import { useState } from "react";
import { JobProfitTable } from "@/components/reports/job-profit-table";
import { cn } from "@/lib/utils";
import type { JobProfitRow } from "@/lib/reports/finance";

export function JobProfitSection({
  thisMonth,
  ytd,
}: {
  thisMonth: JobProfitRow[];
  ytd: JobProfitRow[];
}) {
  const [period, setPeriod] = useState<"month" | "ytd">("month");
  const rows = period === "month" ? thisMonth : ytd;

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
        {([
          ["month", "เดือนนี้"],
          ["ytd", "ตั้งแต่ต้นปี"],
        ] as [typeof period, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={cn(
              "rounded-md px-3 py-1.5 transition",
              period === key ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <JobProfitTable rows={rows} />
    </div>
  );
}
