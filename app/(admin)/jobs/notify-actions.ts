"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendStatusNotificationToCustomer } from "@/lib/jobs/notifications";
import type { JobStatus } from "@/lib/types/database";

export async function manualSendLineNotification(jobId: string) {
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("status").eq("id", jobId).maybeSingle();
  const j = job as { status: JobStatus } | null;
  if (!j) return { ok: false as const, error: "ไม่พบ JOB" };

  const result = await sendStatusNotificationToCustomer(jobId, j.status);
  revalidatePath(`/jobs/${jobId}`);

  if (!result.ok) {
    return { ok: false as const, error: result.error ?? "ส่งไม่สำเร็จ" };
  }
  return {
    ok: true as const,
    sent: result.sent,
    total: result.total,
    failures: result.failures,
  };
}
