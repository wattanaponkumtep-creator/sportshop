"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendStatusNotificationToCustomer } from "@/lib/jobs/notifications";

/**
 * อนุมัติ "ตัวอย่าง" → ปลดล็อกผลิตเต็มล็อต
 * ถ้างานยังอยู่สถานะ "ส่งโรงงาน" จะเลื่อนเป็น "ผลิต" + แจ้งลูกค้าให้อัตโนมัติ
 */
export async function approveSample(jobId: string) {
  const supabase = await createClient();

  const { data: job, error: jErr } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .single();
  if (jErr || !job) return { ok: false as const, error: jErr?.message ?? "ไม่พบงาน" };

  const advance = job.status === "sent_to_factory";
  const update: Record<string, unknown> = {
    sample_status: "approved",
    sample_approved_at: new Date().toISOString(),
  };
  if (advance) update.status = "producing";

  const { error } = await supabase.from("jobs").update(update).eq("id", jobId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "sample_approved",
    description: advance
      ? "✅ อนุมัติตัวอย่าง — ปลดล็อกผลิตเต็มล็อต (เลื่อนเป็น ผลิต)"
      : "✅ อนุมัติตัวอย่าง — ผลิตเต็มล็อตได้",
  });

  if (advance) {
    try {
      await sendStatusNotificationToCustomer(jobId, "producing");
    } catch {
      // แจ้งลูกค้าไม่สำเร็จ ไม่ควรบล็อกการอนุมัติ
    }
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  return { ok: true as const, advanced: advance };
}

/** ตีกลับตัวอย่างให้โรงงานแก้ */
export async function rejectSample(jobId: string, note: string) {
  const supabase = await createClient();
  const clean = note.trim();

  const { error } = await supabase
    .from("jobs")
    .update({ sample_status: "rejected", sample_note: clean || null, sample_approved_at: null })
    .eq("id", jobId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "sample_rejected",
    description: `❌ ตัวอย่างไม่ผ่าน — ให้โรงงานแก้${clean ? `: ${clean}` : ""}`,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}
