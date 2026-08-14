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
    supabase.from("jobs").select("id, status, sale_price, discount, cost, factory_cost_paid_at, factory_id"),
  ]);

  const pays = (payments ?? []) as { job_id: string; type: string; amount: number }[];
  const exps = (expenses ?? []) as { amount: number }[];
  const js = (jobs ?? []) as {
    id: string;
    status: JobStatus;
    sale_price: number;
    discount: number;
    cost: number;
    factory_cost_paid_at: string | null;
    factory_id: string | null;
  }[];

  // เงินสดในระบบ = รับจากลูกค้า (สุทธิ) − จ่ายออกที่บันทึกไว้
  const totalReceived = pays.reduce((s, p) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)), 0);
  const totalPaidOut = exps.reduce((s, e) => s + Number(e.amount), 0);
  const cashOnHand = totalReceived - totalPaidOut;

  // ยอดที่จ่ายแล้วต่องาน (สำหรับคำนวณยอดค้างเก็บ)
  const paidByJob = new Map<string, number>();
  for (const p of pays) {
    paidByJob.set(p.job_id, (paidByJob.get(p.job_id) ?? 0) + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)));
  }

  // เงินลูกค้าของงานที่ยังไม่ปิด (completed/cancelled = ปิดแล้ว) → ยังไม่ใช่กำไร
  const openIds = new Set(js.filter((j) => j.status !== "completed" && j.status !== "cancelled").map((j) => j.id));
  let heldForOpen = 0;
  for (const p of pays) {
    if (openIds.has(p.job_id)) heldForOpen += p.type === "refund" ? -Number(p.amount) : Number(p.amount);
  }

  // เงินที่ลูกค้ายังค้างจ่าย (คาดว่าจะเก็บได้) — ทุกงานที่ยังไม่ยกเลิก
  let outstandingReceivable = 0;
  for (const j of js) {
    if (j.status === "cancelled") continue;
    const net = Math.max(0, Number(j.sale_price ?? 0) - Number(j.discount ?? 0));
    outstandingReceivable += Math.max(0, net - (paidByJob.get(j.id) ?? 0));
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
    outstandingReceivable,
    factoryPayable,
    factoryPayableCount,
    factoryCount,
    // เอาออกได้ทันทีจากเงินสดตอนนี้ (หักค่าผลิต) — อาจติดลบถ้ายังไม่เก็บเงินลูกค้า
    safeAfterFactory: cashOnHand - factoryPayable,
    // เมื่อเก็บเงินลูกค้าครบแล้ว: บวกยอดค้างเก็บเข้าไปด้วย
    projectedAfterCollect: cashOnHand + outstandingReceivable - factoryPayable,
    // ปลอดภัยสุด: เอาเฉพาะเงินของงานที่ปิดแล้ว (กันเงินลูกค้างานที่ยังไม่ปิดไว้)
    safeConservative: cashOnHand - Math.max(0, heldForOpen),
  };
}
