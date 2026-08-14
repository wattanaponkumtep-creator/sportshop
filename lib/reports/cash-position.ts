import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FACTORY_TO_PAY_STATUSES } from "@/lib/reports/factory-payables";
import type { JobStatus } from "@/lib/types/database";

// สถานะเงินสดภาพรวม (ทั้งหมด ไม่จำกัดช่วงเวลา) — สำหรับคำนวณ "เงินที่เอาออกมาใช้ได้"
export async function getCashPosition() {
  const supabase = await createClient();

  const [{ data: payments }, { data: expenses }, { data: jobs }] = await Promise.all([
    supabase.from("payments").select("job_id, type, amount"),
    supabase.from("expenses").select("amount"),
    supabase.from("jobs").select("id, status, cost, factory_cost_paid_at, factory_id"),
  ]);

  const pays = (payments ?? []) as { job_id: string; type: string; amount: number }[];
  const exps = (expenses ?? []) as { amount: number }[];
  const js = (jobs ?? []) as {
    id: string;
    status: JobStatus;
    cost: number;
    factory_cost_paid_at: string | null;
    factory_id: string | null;
  }[];

  // เงินสดในระบบ = รับจากลูกค้า (สุทธิ) − จ่ายออกที่บันทึกไว้
  const totalReceived = pays.reduce((s, p) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)), 0);
  const totalPaidOut = exps.reduce((s, e) => s + Number(e.amount), 0);
  const cashOnHand = totalReceived - totalPaidOut;

  // เงินลูกค้าของงานที่ยังไม่ปิด (completed/cancelled = ปิดแล้ว) → ยังไม่ใช่กำไร
  const openIds = new Set(js.filter((j) => j.status !== "completed" && j.status !== "cancelled").map((j) => j.id));
  let heldForOpen = 0;
  for (const p of pays) {
    if (openIds.has(p.job_id)) heldForOpen += p.type === "refund" ? -Number(p.amount) : Number(p.amount);
  }

  // ค่าผลิตที่ยังต้องจ่ายโรงงาน (งานกำลังผลิต ยังไม่จ่าย)
  const payableJobs = js.filter(
    (j) => FACTORY_TO_PAY_STATUSES.includes(j.status) && Number(j.cost) > 0 && !j.factory_cost_paid_at,
  );
  const factoryPayable = payableJobs.reduce((s, j) => s + Number(j.cost), 0);
  const factoryPayableCount = payableJobs.length;
  const factoryCount = new Set(payableJobs.map((j) => j.factory_id ?? "_none")).size;

  return {
    totalReceived,
    totalPaidOut,
    cashOnHand,
    heldForOpen: Math.max(0, heldForOpen),
    factoryPayable,
    factoryPayableCount,
    factoryCount,
    // เอาออกได้ (หลังกันค่าผลิตโรงงาน) — ตามที่ต้องการ
    safeAfterFactory: cashOnHand - factoryPayable,
    // ปลอดภัยสุด: เอาเฉพาะเงินของงานที่ปิดแล้ว (กันเงินลูกค้างานที่ยังไม่ปิดไว้)
    safeConservative: cashOnHand - Math.max(0, heldForOpen),
  };
}
