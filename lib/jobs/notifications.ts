import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { pushLineMessage, isLineConfigured } from "@/lib/line/client";
import { buildStatusUpdateMessage } from "@/lib/line/templates";
import type { JobStatus } from "@/lib/types/database";

/**
 * Send LINE notification to all LINE OA channels of the customer for this job.
 * Returns details about what was sent (and what failed).
 */
export async function sendStatusNotificationToCustomer(jobId: string, status: JobStatus) {
  if (!isLineConfigured()) {
    return { ok: false as const, error: "LINE OA ยังไม่ได้ตั้งค่า env vars" };
  }

  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("job_code, product_type, customer_id, track_token")
    .eq("id", jobId)
    .maybeSingle();
  const j = job as { job_code: string; product_type: string | null; customer_id: string; track_token: string } | null;
  if (!j) return { ok: false as const, error: "ไม่พบ JOB" };

  const { data: channels } = await supabase
    .from("customer_channels")
    .select("external_id")
    .eq("customer_id", j.customer_id)
    .eq("channel_type", "line_oa");

  const lineUserIds = ((channels ?? []) as { external_id: string | null }[])
    .map((c) => c.external_id)
    .filter((id): id is string => !!id);

  if (lineUserIds.length === 0) {
    return { ok: false as const, error: "ลูกค้ายังไม่ได้เชื่อม LINE OA" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const trackUrl = `${siteUrl}/track/${j.track_token}`;

  const text = buildStatusUpdateMessage({
    jobCode: j.job_code,
    productType: j.product_type,
    status,
    trackUrl,
  });

  let successCount = 0;
  const failures: string[] = [];

  for (const userId of lineUserIds) {
    const result = await pushLineMessage(userId, [{ type: "text", text }]);

    await supabase.from("notifications").insert({
      job_id: jobId,
      customer_id: j.customer_id,
      channel: "line_oa",
      template: `status_${status}`,
      payload: { user_id: userId, text },
      status: result.ok ? "sent" : "failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    if (result.ok) successCount++;
    else failures.push(`${userId}: ${result.error}`);
  }

  return {
    ok: successCount > 0,
    sent: successCount,
    total: lineUserIds.length,
    failures: failures.length > 0 ? failures : undefined,
  };
}
