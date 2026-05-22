"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CHANNEL_VALUES = ["phone", "line", "line_oa", "fb", "fb_page", "other"] as const;

const channelSchema = z.object({
  channel_type: z.enum(CHANNEL_VALUES),
  external_id: z.string().trim().optional().nullable(),
  display_name: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

const customerSchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อ"),
  phone: z.string().trim().optional().nullable(),
  primary_channel: z.enum(CHANNEL_VALUES).default("phone"),
  note: z.string().trim().optional().nullable(),
  channels: z.array(channelSchema).default([]),
});

export type CustomerFormInput = z.input<typeof customerSchema>;

export async function createCustomer(input: CustomerFormInput) {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      primary_channel: parsed.data.primary_channel,
      note: parsed.data.note || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !customer) {
    return { ok: false as const, error: error?.message ?? "บันทึกไม่สำเร็จ" };
  }

  const cleanedChannels = parsed.data.channels.filter((c) => c.external_id || c.display_name);
  if (cleanedChannels.length > 0) {
    await supabase.from("customer_channels").insert(
      cleanedChannels.map((c) => ({
        customer_id: customer.id,
        channel_type: c.channel_type,
        external_id: c.external_id || null,
        display_name: c.display_name || null,
        note: c.note || null,
      }))
    );
  }

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: string, input: CustomerFormInput) {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      primary_channel: parsed.data.primary_channel,
      note: parsed.data.note || null,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/customers/${id}`);
  return { ok: true as const };
}

export async function addCustomerChannel(
  customerId: string,
  input: z.input<typeof channelSchema>
) {
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase.from("customer_channels").insert({
    customer_id: customerId,
    channel_type: parsed.data.channel_type,
    external_id: parsed.data.external_id || null,
    display_name: parsed.data.display_name || null,
    note: parsed.data.note || null,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { ok: true as const };
}

export async function removeCustomerChannel(channelId: string, customerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("customer_channels").delete().eq("id", channelId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { ok: true as const };
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();

  // Check if customer has any jobs
  const { count: jobCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", id);

  if (jobCount && jobCount > 0) {
    return {
      ok: false as const,
      error: `ลบไม่ได้ — ลูกค้าคนนี้มีงาน ${jobCount} รายการ ลบงานทั้งหมดก่อน หรือย้ายงานไปลูกค้าคนอื่น`,
    };
  }

  // Customer channels will cascade delete automatically (on delete cascade)
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/customers");
  return { ok: true as const };
}
