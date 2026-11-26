"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  job_id: z.string().uuid(),
  reason: z.string().trim().min(1, "ใส่รายละเอียดเคลม"),
  fault: z.enum(["shop", "customer", "factory"]),
});

export async function createClaim(input: z.input<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase.from("claims").insert({
    job_id: parsed.data.job_id,
    reason: parsed.data.reason,
    fault: parsed.data.fault,
  });
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("job_timeline").insert({
    job_id: parsed.data.job_id,
    event_type: "claim_opened",
    description: `🛟 เปิดเคลม: ${parsed.data.reason}`,
  });
  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return { ok: true as const };
}

export async function resolveClaim(claimId: string, jobId: string, resolution: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("claims")
    .update({ status: "resolved", resolution: resolution.trim() || null, resolved_at: new Date().toISOString() })
    .eq("id", claimId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "claim_resolved",
    description: `✅ ปิดเคลม${resolution.trim() ? `: ${resolution.trim()}` : ""}`,
  });
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}
