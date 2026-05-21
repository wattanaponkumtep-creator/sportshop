"use client";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_STATUS_LABEL, JOB_STATUS_ORDER } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";
import { updateJobStatus } from "@/app/(admin)/jobs/actions";
import { toast } from "@/components/ui/use-toast";

export function JobStatusSelect({ jobId, currentStatus }: { jobId: string; currentStatus: JobStatus }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: JobStatus) {
    startTransition(async () => {
      const result = await updateJobStatus(jobId, next);
      if (result.ok) toast({ title: "อัปเดตสถานะแล้ว" });
      else toast({ title: "อัปเดตไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  return (
    <Select value={currentStatus} onValueChange={(v: JobStatus) => handleChange(v)} disabled={isPending}>
      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {JOB_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{JOB_STATUS_LABEL[s]}</SelectItem>)}
        <SelectItem value="cancelled">{JOB_STATUS_LABEL.cancelled}</SelectItem>
      </SelectContent>
    </Select>
  );
}
