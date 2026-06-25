"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const RANGES = [
  { value: "this_month", label: "เดือนนี้" },
  { value: "3_months", label: "3 เดือน" },
  { value: "ytd", label: "ปีนี้" },
  { value: "all", label: "ทั้งหมด" },
] as const;

export function FinanceRangeTabs({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function select(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", value);
    startTransition(() => router.push(`/reports/finance?${next.toString()}`));
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/40 p-1">
      {isPending && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => select(r.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            current === r.value
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
