"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const stageSchema = z.object({
  layout_progress: z.coerce.number().int().min(0).max(100).optional(),
  print_progress: z.coerce.number().int().min(0).max(100).optional(),
  sew_progress: z.coerce.number().int().min(0).max(100).optional(),
  ship_progress: z.coerce.number().int().min(0).max(100).optional(),
});

export type StageInput = z.input<typeof stageSchema>;

export async function updateProductionStages(jobId: string, input: StageInput) {
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const updates: Record<string, number> = {};
  if (parsed.data.layout_progress !== undefined) updates.layout_progress = parsed.data.layout_progress;
  if (parsed.data.print_progress !== undefined) updates.print_progress = parsed.data.print_progress;
  if (parsed.data.sew_progress !== undefined) updates.sew_progress = parsed.data.sew_progress;
  if (parsed.data.ship_progress !== undefined) updates.ship_progress = parsed.data.ship_progress;

  if (Object.keys(updates).length === 0) return { ok: true as const };

  const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const checkinSchema = z.object({
  factory_id: z.string().uuid().nullable().optional(),
  status: z.string().trim().min(1, "กรุณาใส่สถานะ"),
  note: z.string().trim().optional().nullable(),
});

export type CheckinInput = z.input<typeof checkinSchema>;

export async function addFactoryCheckin(jobId: string, input: CheckinInput) {
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("factory_checkins").insert({
    job_id: jobId,
    factory_id: parsed.data.factory_id || null,
    status: parsed.data.status,
    note: parsed.data.note || null,
    checked_in_by: user?.id ?? null,
  });

  if (error) return { ok: false as const, error: error.message };

  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "factory_checkin",
    description: `เช็คอินโรงงาน: ${parsed.data.status}${parsed.data.note ? ` — ${parsed.data.note}` : ""}`,
    actor_id: user?.id ?? null,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

export async function deleteFactoryCheckin(checkinId: string, jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("factory_checkins").delete().eq("id", checkinId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}
