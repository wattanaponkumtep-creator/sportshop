"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1, "กรุณาใส่ชื่อผู้ยืนยัน"),
  agreed: z.boolean(),
});

export type ConfirmInput = z.input<typeof schema>;

export async function submitOrderConfirmation(input: ConfirmInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  if (!parsed.data.agreed) {
    return { ok: false as const, error: "กรุณายอมรับเงื่อนไขก่อนยืนยัน" };
  }

  const supabase = createServiceClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, order_confirmed_at")
    .eq("order_confirm_token", parsed.data.token)
    .maybeSingle();

  if (error || !job) return { ok: false as const, error: "ไม่พบออเดอร์" };
  if (job.order_confirmed_at) return { ok: true as const }; // ยืนยันแล้ว (idempotent)

  const { error: upErr } = await supabase
    .from("jobs")
    .update({
      order_confirmed_at: new Date().toISOString(),
      order_confirmed_by: parsed.data.name,
    })
    .eq("id", job.id);
  if (upErr) return { ok: false as const, error: upErr.message };

  await supabase.from("job_timeline").insert({
    job_id: job.id,
    event_type: "order_confirmed",
    description: `✅ ลูกค้ายืนยันออเดอร์แล้ว (โดย ${parsed.data.name})`,
  });

  revalidatePath(`/confirm/${parsed.data.token}`);
  return { ok: true as const };
}
