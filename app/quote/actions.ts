"use server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const inquirySchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อ"),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  line_id: z.string().trim().optional().nullable(),
  team_name: z.string().trim().optional().nullable(),
  product_type: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().min(0).optional().nullable(),
  budget: z.coerce.number().min(0).optional().nullable(),
  message: z.string().trim().optional().nullable(),
});

export async function submitQuoteInquiry(input: z.input<typeof inquirySchema>) {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const hasContact =
    (parsed.data.phone && parsed.data.phone.length > 0) ||
    (parsed.data.email && parsed.data.email.length > 0) ||
    (parsed.data.line_id && parsed.data.line_id.length > 0);
  if (!hasContact) {
    return { ok: false as const, error: "กรุณาใส่เบอร์โทร หรือ Email หรือ LINE ID อย่างน้อย 1 อย่าง" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("submit_inquiry", {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone ?? null,
    p_email: parsed.data.email ?? null,
    p_line_id: parsed.data.line_id ?? null,
    p_team_name: parsed.data.team_name ?? null,
    p_product_type: parsed.data.product_type ?? null,
    p_quantity: parsed.data.quantity ?? null,
    p_budget: parsed.data.budget ?? null,
    p_message: parsed.data.message ?? null,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
