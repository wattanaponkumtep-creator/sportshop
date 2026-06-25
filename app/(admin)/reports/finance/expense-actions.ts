"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CATEGORY_VALUES = [
  "factory", "material", "shipping", "rent", "salary",
  "marketing", "utility", "equipment", "other",
] as const;

const expenseSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  amount: z.coerce.number().min(0.01, "จำนวนเงินต้องมากกว่า 0"),
  paid_at: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
});

export type ExpenseInput = z.input<typeof expenseSchema>;

export async function addExpense(input: ExpenseInput) {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("expenses").insert({
    category: parsed.data.category,
    amount: parsed.data.amount,
    paid_at: parsed.data.paid_at || new Date().toISOString(),
    note: parsed.data.note || null,
    job_id: parsed.data.job_id || null,
    created_by: user?.id ?? null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/reports/finance");
  return { ok: true as const };
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/reports/finance");
  return { ok: true as const };
}
