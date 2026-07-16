"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendDailyDigestToAllAdmins } from "@/lib/jobs/daily-digest";

const updatePersonalLineSchema = z.object({
  line_user_id_personal: z.string().trim().optional().nullable(),
});

export async function updatePersonalLineUserId(input: z.input<typeof updatePersonalLineSchema>) {
  const parsed = updatePersonalLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ line_user_id_personal: parsed.data.line_user_id_personal?.trim() || null })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/settings");
  return { ok: true as const };
}

export async function regenerateCalendarToken() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  // Use Supabase function gen_random_bytes via RPC, or generate in JS
  const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { error } = await supabase
    .from("users")
    .update({ calendar_token: newToken })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/settings");
  return { ok: true as const, token: newToken };
}

export async function sendDigestNow() {
  const result = await sendDailyDigestToAllAdmins();
  return result;
}

// ---------- Digest recipients (หลาย LINE ID) ----------
const recipientSchema = z.object({
  name: z.string().trim().optional().nullable(),
  line_user_id: z.string().trim().min(1, "กรุณาใส่ LINE User ID"),
});

export async function addDigestRecipient(input: z.input<typeof recipientSchema>) {
  const parsed = recipientSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const lineId = parsed.data.line_user_id.trim();

  // กัน ID ซ้ำ
  const { data: existing } = await supabase
    .from("digest_recipients")
    .select("id")
    .eq("line_user_id", lineId)
    .maybeSingle();
  if (existing) return { ok: false as const, error: "LINE ID นี้มีอยู่แล้ว" };

  const { error } = await supabase.from("digest_recipients").insert({
    name: parsed.data.name?.trim() || null,
    line_user_id: lineId,
    is_active: true,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/settings");
  return { ok: true as const };
}

export async function toggleDigestRecipient(id: string, is_active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("digest_recipients")
    .update({ is_active })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function deleteDigestRecipient(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("digest_recipients").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/settings");
  return { ok: true as const };
}
