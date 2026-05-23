"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, Clock, Info, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Alert = {
  job_id: string;
  job_code: string;
  customer_name: string;
  reason: string;
  level: "urgent" | "warning" | "info";
  detail: string;
};

export function NotificationBell({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const urgent = alerts.filter((a) => a.level === "urgent").length;
  const count = alerts.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        aria-label="การแจ้งเตือน"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
              urgent > 0 ? "bg-destructive" : "bg-amber-500"
            )}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[320px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          <div className="border-b border-border bg-card/40 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">การแจ้งเตือน</h3>
              {count > 0 && (
                <span className="text-xs text-muted-foreground">{count} รายการ</span>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center">
                <div className="mb-2 text-2xl">🎉</div>
                <p className="text-sm text-muted-foreground">ไม่มีเรื่องเร่งด่วน</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alerts.map((a) => {
                  const Icon = a.level === "urgent" ? AlertTriangle : a.level === "warning" ? Clock : Info;
                  const iconColor =
                    a.level === "urgent" ? "text-destructive" : a.level === "warning" ? "text-amber-400" : "text-muted-foreground";
                  return (
                    <Link
                      key={a.job_id}
                      href={`/jobs/${a.job_id}`}
                      onClick={() => setOpen(false)}
                      className="block p-3 transition hover:bg-accent"
                    >
                      <div className="flex items-start gap-2.5">
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold">{a.job_code}</span>
                            <span className="truncate text-xs text-muted-foreground">{a.customer_name}</span>
                          </div>
                          <div className="mt-1 text-xs font-medium">{a.reason}</div>
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{a.detail}</div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {alerts.length > 0 && (
            <div className="border-t border-border bg-card/40 p-2">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block rounded-md p-2 text-center text-xs font-medium text-primary hover:bg-accent"
              >
                ดูทั้งหมดใน Dashboard →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
