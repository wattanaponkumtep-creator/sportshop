"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const lineItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_type: z.string().trim().optional().nullable(),
  collar_type: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().min(0),
  unit_sale_price: z.coerce.number().min(0),
  unit_cost: z.coerce.number().min(0),
  factory_id: z.string().uuid().optional().nullable(),
});

export type LineItemInput = z.input<typeof lineItemSchema>;

export async function saveLineItems(jobId: string, items: LineItemInput[]) {
  const parsed = z.array(lineItemSchema).safeParse(items);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();

  // Delete all and re-insert (simpler than diff)
  await supabase.from("job_line_items").delete().eq("job_id", jobId);

  if (parsed.data.length > 0) {
    const rows = parsed.data.map((it, idx) => ({
      job_id: jobId,
      product_type: it.product_type || null,
      collar_type: it.collar_type || null,
      description: it.description || null,
      quantity: it.quantity,
      unit_sale_price: it.unit_sale_price,
      unit_cost: it.unit_cost,
      factory_id: it.factory_id || null,
      position: idx,
    }));
    const { error } = await supabase.from("job_line_items").insert(rows);
    if (error) return { ok: false as const, error: error.message };
  }

  // Aggregate totals → update jobs.sale_price + cost + quantity
  const totalQty = parsed.data.reduce((s, it) => s + it.quantity, 0);
  const totalSale = parsed.data.reduce((s, it) => s + it.unit_sale_price * it.quantity, 0);
  const totalCost = parsed.data.reduce((s, it) => s + it.unit_cost * it.quantity, 0);

  await supabase
    .from("jobs")
    .update({
      quantity: totalQty,
      sale_price: totalSale,
      cost: totalCost,
    })
    .eq("id", jobId);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/reports");
  return { ok: true as const };
}

const extraCostSchema = z.object({
  shipping_cost: z.coerce.number().min(0).optional(),
  other_cost: z.coerce.number().min(0).optional(),
});

export async function updateExtraCosts(jobId: string, input: z.input<typeof extraCostSchema>) {
  const parsed = extraCostSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const updates: Record<string, number> = {};
  if (parsed.data.shipping_cost !== undefined) updates.shipping_cost = parsed.data.shipping_cost;
  if (parsed.data.other_cost !== undefined) updates.other_cost = parsed.data.other_cost;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}
