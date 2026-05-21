"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JOB_STATUS_LABEL, JOB_STATUS_ORDER, PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/constants";
import { cn, formatBaht, formatDateShort } from "@/lib/utils";
import type { JobStatus, PriorityLevel } from "@/lib/types/database";
import { updateJobStatus } from "@/app/(admin)/jobs/actions";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

type KanbanJob = {
  id: string;
  job_code: string;
  status: JobStatus;
  priority: PriorityLevel;
  quantity: number;
  sale_price: number;
  due_date: string | null;
  customers?: { name: string } | { name: string }[] | null;
};

export function KanbanBoard({ initialJobs }: { initialJobs: KanbanJob[] }) {
  const [jobs, setJobs] = useState<KanbanJob[]>(initialJobs);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kanban-jobs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setJobs((cur) => [payload.new as KanbanJob, ...cur]);
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setJobs((cur) => cur.map((j) => (j.id === (payload.new as KanbanJob).id ? { ...j, ...(payload.new as KanbanJob) } : j)));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setJobs((cur) => cur.filter((j) => j.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const jobId = String(event.active.id);
    const targetStatus = event.over?.id ? (String(event.over.id) as JobStatus) : null;
    if (!targetStatus) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === targetStatus) return;

    setJobs((cur) => cur.map((j) => (j.id === jobId ? { ...j, status: targetStatus } : j)));
    startTransition(async () => {
      const result = await updateJobStatus(jobId, targetStatus);
      if (!result.ok) {
        setJobs((cur) => cur.map((j) => (j.id === jobId ? { ...j, status: job.status } : j)));
        toast({ title: "อัปเดตไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {JOB_STATUS_ORDER.map((status) => {
          const colJobs = jobs.filter((j) => j.status === status);
          return <KanbanColumn key={status} status={status} jobs={colJobs} />;
        })}
      </div>
    </DndContext>
  );
}

function KanbanColumn({ status, jobs }: { status: JobStatus; jobs: KanbanJob[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-card/40 p-3 transition-colors",
        isOver && "border-primary bg-primary/5"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{JOB_STATUS_LABEL[status]}</h3>
        <Badge variant="secondary" className="text-[10px]">{jobs.length}</Badge>
      </div>
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 360px)" }}>
        {jobs.map((j) => <KanbanCard key={j.id} job={j} />)}
        {jobs.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">ว่าง</p>}
      </div>
    </div>
  );
}

function KanbanCard({ job }: { job: KanbanJob }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <Link href={`/jobs/${job.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <Card className="border-border/60 transition hover:border-primary/50">
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold">{job.job_code}</span>
              <Badge className={cn("h-5 px-1.5 text-[10px]", PRIORITY_COLOR[job.priority])}>
                {PRIORITY_LABEL[job.priority]}
              </Badge>
            </div>
            <div className="truncate text-sm">{customer?.name ?? "-"}</div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{job.quantity} ตัว</span>
              <span className="tabular-nums">{formatBaht(Number(job.sale_price))}</span>
            </div>
            {job.due_date && (
              <div className="text-xs text-muted-foreground">ส่ง: {formatDateShort(job.due_date)}</div>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
