import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMonthBoundsBangkok, resolveRange, type FinanceRange } from "@/lib/reports/queries";
import type { Expense, ExpenseCategory } from "@/lib/types/database";

type PaymentRow = { type: string; amount: number; paid_at: string };
type ExpenseRow = { category: ExpenseCategory; amount: number; paid_at: string };
type ClosedJobRow = {
  status: string;
  sale_price: number;
  discount: number;
  cost: number;
  shipping_cost: number;
  other_cost: number;
  product_type: string | null;
  updated_at: string;
};

// หมวดที่ถือเป็น "ต้นทุนงาน" (COGS) — ไม่นับซ้ำใน operating expenses
const COGS_CATEGORIES: ExpenseCategory[] = ["factory", "material", "shipping"];

function isOperatingExpense(cat: ExpenseCategory): boolean {
  return !COGS_CATEGORIES.includes(cat);
}

function net(sale: number, discount: number) {
  return Math.max(0, Number(sale ?? 0) - Number(discount ?? 0));
}

export type FinanceMonth = {
  label: string;
  cashIn: number;
  cashOut: number;
  netCash: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
};

export async function getFinanceData(range: FinanceRange = "this_month") {
  const supabase = await createClient();
  const r = resolveRange(range);
  const sixBack = getMonthBoundsBangkok(5).start;
  // ดึงข้อมูลตั้งแต่จุดที่เก่าที่สุดที่ต้องใช้ (range เริ่ม หรือ 6 เดือนก่อน — เอาอันที่เก่ากว่า)
  const dataStart = r.start < sixBack ? r.start : sixBack;

  const [
    { data: payments },
    { data: expenses },
    { data: jobs },
    { data: recentExpenses },
    { data: openJobs },
    { data: allPaymentsForOutstanding },
    { count: pendingInquiries },
  ] = await Promise.all([
    supabase.from("payments").select("type, amount, paid_at").gte("paid_at", dataStart),
    supabase.from("expenses").select("category, amount, paid_at").gte("paid_at", dataStart),
    supabase
      .from("jobs")
      .select("status, sale_price, discount, cost, shipping_cost, other_cost, product_type, updated_at")
      .gte("updated_at", dataStart)
      .in("status", ["shipped", "completed"]),
    supabase.from("expenses").select("*").order("paid_at", { ascending: false }).limit(20),
    // เอกสารรอ: งานที่ยังไม่ปิด
    supabase
      .from("jobs")
      .select("id, status, sale_price, discount")
      .not("status", "in", "(completed,cancelled)"),
    // payments ทั้งหมด (สำหรับคำนวณยอดค้าง)
    supabase.from("payments").select("job_id, type, amount"),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new")
      .then((res) => res, () => ({ count: 0 })),
  ]);

  const allPayments = (payments ?? []) as PaymentRow[];
  const allExpenses = (expenses ?? []) as ExpenseRow[];
  const closedJobs = (jobs ?? []) as ClosedJobRow[];

  const inRange = (d: string) => d >= r.start && d < r.end;

  // ---------- Ranged totals ----------
  const rangedPayments = allPayments.filter((p) => inRange(p.paid_at));
  const rangedExpenses = allExpenses.filter((e) => inRange(e.paid_at));
  const rangedClosed = closedJobs.filter((j) => inRange(j.updated_at));

  const cashIn = rangedPayments.reduce(
    (s, p) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)),
    0,
  );
  const cashOut = rangedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const revenue = rangedClosed.reduce((s, j) => s + net(j.sale_price, j.discount), 0);
  const cogs = rangedClosed.reduce(
    (s, j) => s + Number(j.cost ?? 0) + Number(j.shipping_cost ?? 0) + Number(j.other_cost ?? 0),
    0,
  );
  const grossProfit = revenue - cogs;
  const operatingExpenses = rangedExpenses
    .filter((e) => isOperatingExpense(e.category))
    .reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = grossProfit - operatingExpenses;

  // ---------- Expense donut (ranged) ----------
  const expByCat = new Map<string, number>();
  for (const e of rangedExpenses) {
    expByCat.set(e.category, (expByCat.get(e.category) ?? 0) + Number(e.amount));
  }
  const expenseByCategory = Array.from(expByCat.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // ---------- Income donut (ranged, by product_type) ----------
  const incByType = new Map<string, number>();
  for (const j of rangedClosed) {
    const t = (j.product_type ?? "").trim() || "ไม่ระบุประเภท";
    incByType.set(t, (incByType.get(t) ?? 0) + net(j.sale_price, j.discount));
  }
  const incomeByType = Array.from(incByType.entries())
    .map(([type, amount]) => ({ type, amount }))
    .sort((a, b) => b.amount - a.amount);

  // ---------- Monthly trend (always last 6 months) ----------
  const monthly: FinanceMonth[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = getMonthBoundsBangkok(i);
    const inMonth = (d: string) => d >= m.start && d < m.end;
    const mCashIn = allPayments
      .filter((p) => inMonth(p.paid_at))
      .reduce((s, p) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)), 0);
    const mCashOut = allExpenses.filter((e) => inMonth(e.paid_at)).reduce((s, e) => s + Number(e.amount), 0);
    const mClosed = closedJobs.filter((j) => inMonth(j.updated_at));
    const mRevenue = mClosed.reduce((s, j) => s + net(j.sale_price, j.discount), 0);
    const mCogs = mClosed.reduce(
      (s, j) => s + Number(j.cost ?? 0) + Number(j.shipping_cost ?? 0) + Number(j.other_cost ?? 0),
      0,
    );
    monthly.push({
      label: m.label,
      cashIn: mCashIn,
      cashOut: mCashOut,
      netCash: mCashIn - mCashOut,
      revenue: mRevenue,
      cogs: mCogs,
      grossProfit: mRevenue - mCogs,
    });
  }

  // ---------- Pending documents (snapshot) ----------
  const open = (openJobs ?? []) as { id: string; status: string; sale_price: number; discount: number }[];
  const paidByJob = new Map<string, number>();
  for (const p of (allPaymentsForOutstanding ?? []) as { job_id: string; type: string; amount: number }[]) {
    paidByJob.set(p.job_id, (paidByJob.get(p.job_id) ?? 0) + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)));
  }

  let unpaidCount = 0;
  let unpaidAmount = 0;
  for (const j of open) {
    const remaining = net(j.sale_price, j.discount) - (paidByJob.get(j.id) ?? 0);
    if (remaining > 0) {
      unpaidCount++;
      unpaidAmount += remaining;
    }
  }

  const pending = {
    inquiries: pendingInquiries ?? 0,
    awaitingApproval: open.filter((j) => j.status === "awaiting_approval").length,
    readyToShip: open.filter((j) => j.status === "ready_to_ship").length,
    unpaidCount,
    unpaidAmount,
  };

  return {
    range,
    rangeLabel: r.label,
    summary: {
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netProfit,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    },
    monthly,
    expenseByCategory,
    incomeByType,
    pending,
    recentExpenses: (recentExpenses ?? []) as Expense[],
  };
}
