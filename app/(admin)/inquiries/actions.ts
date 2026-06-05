"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const STATUS_VALUES = ["new", "contacted", "quoted", "converted", "rejected"] as const;

export async function updateInquiryStatus(id: string, status: (typeof STATUS_VALUES)[number]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${id}`);
  return { ok: true as const };
}

const noteSchema = z.object({
  id: z.string().uuid(),
  admin_note: z.string().trim().optional().nullable(),
});

export async function updateInquiryNote(input: z.input<typeof noteSchema>) {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "ข้อมูลไม่ถูกต้อง" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("inquiries")
    .update({ admin_note: parsed.data.admin_note || null })
    .eq("id", parsed.data.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/inquiries/${parsed.data.id}`);
  return { ok: true as const };
}

export async function deleteInquiry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/inquiries");
  return { ok: true as const };
}

// Convert inquiry → customer + redirect to new customer
export async function convertToCustomer(id: string) {
  const supabase = await createClient();
  const { data: inq } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!inq) return { ok: false as const, error: "ไม่พบรายการ" };
  const i = inq as {
    name: string;
    phone: string | null;
    line_id: string | null;
    team_name: string | null;
    message: string | null;
    product_type: string | null;
  };

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      name: i.name,
      phone: i.phone,
      primary_channel: i.line_id ? "line" : i.phone ? "phone" : "other",
      team_name: i.team_name,
      default_job_label: i.product_type,
      note: i.message,
    })
    .select("id")
    .single();
  if (error || !customer) return { ok: false as const, error: error?.message ?? "สร้างลูกค้าไม่สำเร็จ" };

  const customerId = (customer as { id: string }).id;

  // Add LINE channel if provided
  if (i.line_id) {
    await supabase.from("customer_channels").insert({
      customer_id: customerId,
      channel_type: "line",
      external_id: i.line_id,
    });
  }

  // Mark inquiry as converted
  await supabase
    .from("inquiries")
    .update({ status: "converted", converted_to_customer_id: customerId })
    .eq("id", id);

  revalidatePath("/inquiries");
  revalidatePath(`/customers/${customerId}`);
  return { ok: true as const, customerId };
}
