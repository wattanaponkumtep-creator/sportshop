"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const factorySchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อโรงงาน"),
  strengths: z.string().trim().optional().nullable(),
  lead_time_days: z.coerce.number().int().min(0).optional().nullable(),
  quality_score: z.coerce.number().min(0).max(10).optional().nullable(),
  base_price: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type FactoryInput = z.input<typeof factorySchema>;

export async function createFactory(input: FactoryInput) {
  const parsed = factorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase.from("factories").insert({
    name: parsed.data.name,
    strengths: parsed.data.strengths || null,
    lead_time_days: parsed.data.lead_time_days ?? null,
    quality_score: parsed.data.quality_score ?? null,
    base_price: parsed.data.base_price ?? null,
    notes: parsed.data.notes || null,
    is_active: parsed.data.is_active,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/factories");
  return { ok: true as const };
}

export async function updateFactory(id: string, input: FactoryInput) {
  const parsed = factorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase.from("factories").update({
    name: parsed.data.name,
    strengths: parsed.data.strengths || null,
    lead_time_days: parsed.data.lead_time_days ?? null,
    quality_score: parsed.data.quality_score ?? null,
    base_price: parsed.data.base_price ?? null,
    notes: parsed.data.notes || null,
    is_active: parsed.data.is_active,
  }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/factories");
  return { ok: true as const };
}

export async function toggleFactoryActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("factories").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/factories");
  return { ok: true as const };
}

export async function deleteFactory(id: string) {
  const supabase = await createClient();

  const { count: jobCount } = await supabase
    .from("factory_jobs")
    .select("*", { count: "exact", head: true })
    .eq("factory_id", id);

  if (jobCount && jobCount > 0) {
    return {
      ok: false as const,
      error: `ลบไม่ได้ — โรงงานนี้มีประวัติงาน ${jobCount} รายการ แนะนำให้กด "ปิดใช้งาน" แทน`,
    };
  }

  const { error } = await supabase.from("factories").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/factories");
  return { ok: true as const };
}
