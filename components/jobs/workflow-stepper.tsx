"use client";
import { useState } from "react";
import {
  ClipboardList,
  Palette,
  ClipboardCheck,
  Send,
  Factory,
  ShieldCheck,
  Package,
  Truck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JOB_STATUS_LABEL, JOB_STATUS_ORDER } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";
import { cn, formatDateTH, timeAgo } from "@/lib/utils";

type TimelineLike = {
  id?: string;
  event_type: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

const STATUS_KEYS = new Set<string>(JOB_STATUS_ORDER);

function extractToStatus(ev: TimelineLike): string | null {
  // 1) prefer metadata.to
  const meta = ev.metadata as { to?: string } | null;
  if (meta?.to && STATUS_KEYS.has(meta.to)) return meta.to;
  // 2) fallback: parse description like "เปลี่ยนสถานะจาก X → Y"
  const desc = ev.description ?? "";
  const arrowMatch = desc.match(/→\s*([a-z_]+)/i);
  if (arrowMatch && STATUS_KEYS.has(arrowMatch[1])) return arrowMatch[1];
  return null;
}

const STATUS_ICONS: Record<JobStatus, React.ComponentType<{ className?: string }>> = {
  received: ClipboardList,
  designing: Palette,
  awaiting_approval: ClipboardCheck,
  sent_to_factory: Send,
  producing: Factory,
  qc: ShieldCheck,
  ready_to_ship: Package,
  shipped: Truck,
  completed: CheckCircle2,
  cancelled: Circle,
};

const STATUS_DESC: Record<JobStatus, string> = {
  received: "เริ่มต้นรับงานเข้าระบบ — ยังไม่เริ่มดำเนินการ",
  designing: "กำลังออกแบบ Mockup — ทีมร้านทำงานอยู่",
  awaiting_approval: "ส่ง Mockup ให้ลูกค้าอนุมัติ — รอตอบกลับ",
  sent_to_factory: "ส่งไฟล์ไปโรงงานเรียบร้อย — เตรียมผลิต",
  producing: "โรงงานกำลังพิมพ์ลาย / ตัดเย็บ",
  qc: "ตรวจสอบคุณภาพก่อนส่ง — เช็คขนาด/สี/รายละเอียด",
  ready_to_ship: "พร้อมจัดส่ง — รอบริษัทขนส่งรับของ",
  shipped: "ส่งออกแล้ว — อยู่ระหว่างขนส่ง",
  completed: "งานเสร็จสมบูรณ์ — ลูกค้าได้รับของแล้ว",
  cancelled: "งานถูกยกเลิก",
};

type Props = {
  currentStatus: JobStatus;
  timeline?: TimelineLike[];
  hidePending?: boolean;
  variant?: "admin" | "public";
};

type StepState = "completed" | "current" | "pending";

export function WorkflowStepper({ currentStatus, timeline = [], variant = "admin" }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedStep, setExpandedStep] = useState<JobStatus | null>(null);

  if (currentStatus === "cancelled") {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
            <Circle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <div className="font-semibold">งานนี้ถูกยกเลิก</div>
            <div className="text-xs text-muted-foreground">{STATUS_DESC.cancelled}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine state for each step
  const currentIdx = JOB_STATUS_ORDER.indexOf(currentStatus);

  function getStepState(status: JobStatus): StepState {
    const idx = JOB_STATUS_ORDER.indexOf(status);
    if (idx < currentIdx) return "completed";
    if (idx === currentIdx) return "current";
    return "pending";
  }

  // Find the timestamp when each step was reached (from timeline events)
  function getStepEvents(status: JobStatus): TimelineLike[] {
    return timeline.filter((t) => {
      if (t.event_type === "job_created" && status === "received") return true;
      if (t.event_type === "status_changed") {
        return extractToStatus(t) === status;
      }
      return false;
    });
  }

  function getStepTimestamp(status: JobStatus): string | null {
    const events = getStepEvents(status);
    if (events.length === 0) return null;
    return events[events.length - 1].created_at;
  }

  const progress = Math.round(((currentIdx + 1) / JOB_STATUS_ORDER.length) * 100);

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">ขั้นตอนการทำงาน</h3>
              <Badge variant="outline" className="text-[10px]">
                {currentIdx + 1} / {JOB_STATUS_ORDER.length}
              </Badge>
            </div>
            {!collapsed && (
              <div className="text-xs text-muted-foreground">
                ปัจจุบัน: <span className="font-medium text-foreground">{JOB_STATUS_LABEL[currentStatus]}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? (
              <>
                <ChevronDown className="h-4 w-4" /> ขยาย
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4" /> ซ่อน
              </>
            )}
          </Button>
        </div>

        {/* Progress bar (always visible) */}
        <div className="mb-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>เริ่ม</span>
            <span>{progress}%</span>
            <span>เสร็จ</span>
          </div>
        </div>

        {/* Expanded view */}
        {!collapsed && (
          <div className="space-y-1">
            {JOB_STATUS_ORDER.map((status) => {
              const Icon = STATUS_ICONS[status];
              const state = getStepState(status);
              const timestamp = getStepTimestamp(status);
              const events = getStepEvents(status);
              const isExpanded = expandedStep === status;

              return (
                <div
                  key={status}
                  className={cn(
                    "rounded-md border transition-colors",
                    state === "current" && "border-primary/40 bg-primary/5",
                    state === "completed" && "border-emerald-500/20 bg-emerald-500/5",
                    state === "pending" && "border-border bg-card/30"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedStep(isExpanded ? null : status)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    {/* Step indicator */}
                    <div
                      className={cn(
                        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all",
                        state === "completed" && "bg-emerald-500/20 text-emerald-400",
                        state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                        state === "pending" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {state === "completed" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : state === "current" ? (
                        <>
                          <Icon className="h-4 w-4" />
                          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                        </>
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          state === "pending" && "text-muted-foreground"
                        )}>
                          {JOB_STATUS_LABEL[status]}
                        </span>
                        {state === "current" && (
                          <Badge className="h-5 bg-primary text-[10px] text-primary-foreground">ตอนนี้</Badge>
                        )}
                        {state === "completed" && (
                          <Badge variant="outline" className="h-5 border-emerald-500/40 text-[10px] text-emerald-400">เสร็จ</Badge>
                        )}
                      </div>
                      {timestamp && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDateTH(timestamp, "d MMM yy HH:mm")}
                          <span>·</span>
                          <span>{timeAgo(timestamp)}</span>
                        </div>
                      )}
                    </div>

                    {/* Expand toggle */}
                    {events.length > 0 || state !== "pending" ? (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    ) : null}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border bg-background/40 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{STATUS_DESC[status]}</p>

                      {variant === "admin" && events.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Timeline events</div>
                          {events.map((ev, i) => (
                            <div
                              key={ev.id ?? `${status}-${i}`}
                              className="rounded-md border border-border/50 bg-card/30 p-2 text-xs"
                            >
                              <div className="font-medium">{ev.description ?? "-"}</div>
                              <div className="mt-0.5 text-[10px] text-muted-foreground">
                                {formatDateTH(ev.created_at, "d MMM yy HH:mm")}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {state === "pending" && (
                        <p className="mt-2 text-[11px] italic text-muted-foreground">
                          ⏳ ยังไม่ถึงขั้นตอนนี้
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
