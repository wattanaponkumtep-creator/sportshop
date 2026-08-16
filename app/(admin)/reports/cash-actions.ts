"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const balanceSchema = z.object({
  amount: z.coerce.number().min(0, "ยอดเงินต้องไม่ติดลบ"),
});

// บันทึกยอดเงินในบัญชีจริง (ลง shop_info id=1)
export async function saveBankBalance(input: z.input<typeof balanceSchema>) {
  const parsed = balanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ยอดเงินไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shop_info")
    .update({
      bank_balance: parsed.data.amount,
      bank_balance_updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/reports/finance");
  revalidatePath("/reports");
  revalidatePath("/reports/factory-payables");
  return { ok: true as const };
}

// ลบยอดที่บันทึกไว้ (กลับไปใช้ค่าประมาณจากระบบ)
export async function clearBankBalance() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shop_info")
    .update({ bank_balance: null, bank_balance_updated_at: null })
    .eq("id", 1);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/reports/finance");
  revalidatePath("/reports");
  revalidatePath("/reports/factory-payables");
  return { ok: true as const };
}
