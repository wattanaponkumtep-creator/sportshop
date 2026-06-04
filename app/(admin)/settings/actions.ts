"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const linkSchema = z.object({
  customer_id: z.string().uuid(),
  line_user_id: z.string().min(1),
  display_name: z.string().trim().optional().nullable(),
});

export async function linkLineUserToCustomer(input: z.input<typeof linkSchema>) {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();

  // Check if this LINE user ID is already linked elsewhere
  const { data: existing } = await supabase
    .from("customer_channels")
    .select("id, customer_id")
    .eq("channel_type", "line_oa")
    .eq("external_id", parsed.data.line_user_id)
    .maybeSingle();

  const existingChannel = existing as { id: string; customer_id: string } | null;

  if (existingChannel) {
    if (existingChannel.customer_id === parsed.data.customer_id) {
      return { ok: false as const, error: "เชื่อมกับลูกค้าคนนี้อยู่แล้ว" };
    }
    return { ok: false as const, error: "LINE user นี้เชื่อมกับลูกค้าคนอื่นแล้ว" };
  }

  const { error: insertError } = await supabase.from("customer_channels").insert({
    customer_id: parsed.data.customer_id,
    channel_type: "line_oa",
    external_id: parsed.data.line_user_id,
    display_name: parsed.data.display_name || null,
  });
  if (insertError) return { ok: false as const, error: insertError.message };

  // Update existing events with same line_user_id to link to this customer
  await supabase
    .from("line_webhook_events")
    .update({ customer_id: parsed.data.customer_id, linked_at: new Date().toISOString() })
    .eq("line_user_id", parsed.data.line_user_id)
    .is("customer_id", null);

  revalidatePath("/settings");
  revalidatePath(`/customers/${parsed.data.customer_id}`);
  return { ok: true as const };
}

const shopInfoSchema = z.object({
  shop_name: z.string().trim().min(1, "กรุณาใส่ชื่อร้าน"),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  tax_id: z.string().trim().optional().nullable(),
  bank_info: z.string().trim().optional().nullable(),
});

export type ShopInfoInput = z.input<typeof shopInfoSchema>;

export async function updateShopInfo(input: ShopInfoInput) {
  const parsed = shopInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createClient();

  // Upsert row id=1 (single-row table)
  const { error } = await supabase.from("shop_info").upsert({
    id: 1,
    shop_name: parsed.data.shop_name,
    address: parsed.data.address || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    tax_id: parsed.data.tax_id || null,
    bank_info: parsed.data.bank_info || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/settings");
  return { ok: true as const };
}
