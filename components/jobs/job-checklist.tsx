import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOB_STATUS_ORDER } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";

type Props = {
  status: JobStatus;
  hasApprovedMockup: boolean;
  itemCount: number;
  hasSpec: boolean;
  hasDueDate: boolean;
  orderConfirmed: boolean;
  depositPaid: boolean;
  sampleApproved: boolean;
  receivedCheck: boolean;
  fullyPaid: boolean;
};

export function JobChecklist(p: Props) {
  const sIdx = JOB_STATUS_ORDER.indexOf(p.status);
  const atLeast = (s: JobStatus) => sIdx >= JOB_STATUS_ORDER.indexOf(s);

  const steps: { label: string; done: boolean }[] = [
    { label: "สร้างงาน + ลูกค้า", done: true },
    { label: "ลูกค้าอนุมัติแบบ (Mockup)", done: p.hasApprovedMockup },
    { label: "เก็บรายชื่อ–เบอร์–ไซซ์", done: p.itemCount > 0 },
    { label: "เลือกสเปค + ใส่กำหนดส่ง", done: p.hasSpec && p.hasDueDate },
    { label: "ลูกค้ายืนยันออเดอร์", done: p.orderConfirmed },
    { label: "เก็บมัดจำ", done: p.depositPaid },
    { label: "ส่งใบสั่งงานให้โรงงาน", done: atLeast("sent_to_factory") },
    { label: "อนุมัติตัวอย่าง", done: p.sampleApproved },
    { label: "ผลิตเสร็จ (พร้อมส่ง)", done: atLeast("ready_to_ship") },
    { label: "ตรวจรับของจากโรงงาน", done: p.receivedCheck },
    { label: "เก็บเงินครบ", done: p.fullyPaid },
    { label: "ส่งมอบ / ปิดงาน", done: atLeast("shipped") },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const nextIdx = steps.findIndex((s) => !s.done);
  const allDone = nextIdx === -1;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">✅ เช็กลิสต์งาน</div>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {doneCount}/{steps.length}
          </span>
        </div>

        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", allDone ? "bg-emerald-400" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>

        <ol className="space-y-1">
          {steps.map((s, i) => {
            const isNext = i === nextIdx;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                  isNext && "bg-primary/10 ring-1 ring-primary/30",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]",
                    s.done
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isNext
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground",
                  )}
                >
                  {s.done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={cn(s.done ? "text-muted-foreground line-through" : isNext ? "font-medium" : "")}>
                  {s.label}
                </span>
                {isNext && (
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">
                    ทำต่อ <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {allDone && (
          <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-center text-sm text-emerald-300">
            🎉 ครบทุกขั้นแล้ว!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
