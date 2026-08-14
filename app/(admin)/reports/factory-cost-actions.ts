"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const AUTO_TAG = "[ค่าผลิตอัตโนมัติ]";

// กดว่า "จ่ายค่าผลิตให้โรงงานแล้ว"
// → ตั้ง factory_cost_paid_at + บันทึกเป็นเงินออก (หมวด factory) อัตโนมัติ
export async function markFactoryCostPaid(jobId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_code, cost, factory_cost_paid_at, factories(name)")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return { ok: false as const, error: "ไม่พบงาน" };
  const j = job as unknown as {
    id: string;
    job_code: string;
    cost: number;
    factory_cost_paid_at: string | null;
    factories: { name: string } | { name: string }[] | null;
  };

  if (j.factory_cost_paid_at) return { ok: true as const }; // จ่ายไปแล้ว

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jobs")
    .update({ factory_cost_paid_at: now })
    .eq("id", jobId);
  if (error) return { ok: false as const, error: error.message };

  // บันทึกเงินออก (หมวดโรงงาน) — เพื่อให้กระแสเงินสดถูกต้อง
  const cost = Number(j.cost ?? 0);
  if (cost > 0) {
    const fac = Array.isArray(j.factories) ? j.factories[0] : j.factories;
    await supabase.from("expenses").insert({
      category: "factory",
      amount: cost,
      paid_at: now,
      job_id: jobId,
      note: `${AUTO_TAG} ค่าผลิต ${j.job_code}${fac?.name ? ` — ${fac.name}` : ""}`,
      created_by: user?.id ?? null,
    });
  }

  revalidatePath("/reports/factory-payables");
  revalidatePath("/reports/finance");
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

// ยกเลิกการทำเครื่องหมายว่าจ่ายแล้ว (กดผิด)
export async function unmarkFactoryCostPaid(jobId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .update({ factory_cost_paid_at: null })
    .eq("id", jobId);
  if (error) return { ok: false as const, error: error.message };

  // ลบเฉพาะเงินออกที่ระบบสร้างอัตโนมัติของงานนี้ (ไม่แตะรายการที่กรอกเอง)
  await supabase
    .from("expenses")
    .delete()
    .eq("job_id", jobId)
    .eq("category", "factory")
    .like("note", `${AUTO_TAG}%`);

  revalidatePath("/reports/factory-payables");
  revalidatePath("/reports/finance");
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}
