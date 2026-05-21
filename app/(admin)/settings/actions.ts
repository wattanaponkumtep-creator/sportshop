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
