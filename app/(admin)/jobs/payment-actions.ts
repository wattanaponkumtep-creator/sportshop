"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const paymentTypeValues = ["deposit", "full", "refund"] as const;

const paymentSchema = z.object({
  type: z.enum(paymentTypeValues),
  amount: z.coerce.number().min(0.01, "จำนวนเงินต้องมากกว่า 0"),
  slip_path: z.string().trim().optional().nullable(),
  paid_at: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

export type PaymentInput = z.input<typeof paymentSchema>;

export async function addPayment(jobId: string, input: PaymentInput) {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("payments").insert({
    job_id: jobId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    slip_path: parsed.data.slip_path || null,
    paid_at: parsed.data.paid_at || new Date().toISOString(),
    note: parsed.data.note || null,
    recorded_by: user?.id ?? null,
  });

  if (error) return { ok: false as const, error: error.message };

  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "payment",
    description:
      parsed.data.type === "refund"
        ? `คืนเงิน ${parsed.data.amount.toLocaleString("th-TH")} บาท`
        : `บันทึก${parsed.data.type === "deposit" ? "มัดจำ" : "ชำระเต็ม"} ${parsed.data.amount.toLocaleString("th-TH")} บาท`,
    actor_id: user?.id ?? null,
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/reports");
  return { ok: true as const };
}

export async function deletePayment(paymentId: string, jobId: string) {
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("slip_path, amount, type")
    .eq("id", paymentId)
    .maybeSingle();

  if (payment?.slip_path) {
    await supabase.storage.from("job-files").remove([payment.slip_path]);
  }

  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/reports");
  return { ok: true as const };
}

export async function createSignedSlipUrl(slipPath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("job-files").createSignedUrl(slipPath, 3600);
  if (error || !data) return { ok: false as const, error: error?.message ?? "ไม่สามารถสร้างลิงก์" };
  return { ok: true as const, url: data.signedUrl };
}
