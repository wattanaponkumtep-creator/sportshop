"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const rowSchema = z.object({
  name: z.string().trim().max(120),
  number: z.string().trim().max(20),
  size: z.string().trim().max(20),
});

const schema = z.object({
  token: z.string().min(1),
  rows: z.array(rowSchema),
});

export type RosterInput = z.input<typeof schema>;

export async function submitRoster(input: RosterInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "ข้อมูลไม่ถูกต้อง" };

  const rows = parsed.data.rows.filter((r) => r.name || r.number || r.size);
  if (rows.length === 0) return { ok: false as const, error: "กรุณากรอกอย่างน้อย 1 คน" };

  const supabase = createServiceClient();
  const { data: job, error: jErr } = await supabase
    .from("jobs")
    .select("id, order_confirmed_at")
    .eq("roster_token", parsed.data.token)
    .maybeSingle();
  if (jErr || !job) return { ok: false as const, error: "ไม่พบออเดอร์" };
  if (job.order_confirmed_at) {
    return { ok: false as const, error: "ออเดอร์ยืนยันแล้ว แก้รายชื่อไม่ได้ — ติดต่อทางร้าน" };
  }

  // แทนที่รายชื่อเดิมด้วยที่ลูกค้ากรอก
  await supabase.from("job_items").delete().eq("job_id", job.id);
  const toInsert = rows.map((r, i) => ({
    job_id: job.id,
    name: r.name || null,
    number: r.number || null,
    size: r.size || null,
    position: i,
    quantity: 1,
  }));
  const { error } = await supabase.from("job_items").insert(toInsert);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("jobs").update({ roster_submitted_at: new Date().toISOString() }).eq("id", job.id);
  await supabase.from("job_timeline").insert({
    job_id: job.id,
    event_type: "roster_submitted",
    description: `✅ ลูกค้ากรอกรายชื่อเอง (${rows.length} คน)`,
  });

  revalidatePath(`/roster/${parsed.data.token}`);
  return { ok: true as const, count: rows.length };
}
