import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMonthBoundsBangkok } from "@/lib/reports/queries";
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
  updated_at: string;
};

export type FinanceMonth = {
  label: string;
  cashIn: number;       // เงินเข้าจริง (payments)
  cashOut: number;      // เงินออกจริง (expenses)
  netCash: number;      // กระแสเงินสดสุทธิ
  revenue: number;      // รายได้ (P&L — งานที่ปิดเดือนนี้)
  cogs: number;         // ต้นทุนขาย (cost+shipping+other)
  grossProfit: number;  // กำไรขั้นต้น = revenue - cogs
};

function net(sale: number, discount: number) {
  return Math.max(0, Number(sale ?? 0) - Number(discount ?? 0));
}

export async function getFinanceData() {
  const supabase = await createClient();
  const sixBack = getMonthBoundsBangkok(5).start;

  const [{ data: payments }, { data: expenses }, { data: jobs }, { data: recentExpenses }] = await Promise.all([
    supabase.from("payments").select("type, amount, paid_at").gte("paid_at", sixBack),
    supabase.from("expenses").select("category, amount, paid_at").gte("paid_at", sixBack),
    supabase
      .from("jobs")
      .select("status, sale_price, discount, cost, shipping_cost, other_cost, updated_at")
      .gte("updated_at", sixBack)
      .in("status", ["shipped", "completed"]),
    supabase
      .from("expenses")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(20),
  ]);

  const allPayments = (payments ?? []) as PaymentRow[];
  const allExpenses = (expenses ?? []) as ExpenseRow[];
  const closedJobs = (jobs ?? []) as ClosedJobRow[];

  // ---------- Monthly breakdown (6 months) ----------
  const monthly: FinanceMonth[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = getMonthBoundsBangkok(i);
    const inMonth = (d: string) => d >= m.start && d < m.end;

    const cashIn = allPayments
      .filter((p) => inMonth(p.paid_at))
      .reduce((s, p) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)), 0);

    const cashOut = allExpenses
      .filter((e) => inMonth(e.paid_at))
      .reduce((s, e) => s + Number(e.amount), 0);

    const monthClosed = closedJobs.filter((j) => inMonth(j.updated_at));
    const revenue = monthClosed.reduce((s, j) => s + net(j.sale_price, j.discount), 0);
    const cogs = monthClosed.reduce(
      (s, j) => s + Number(j.cost ?? 0) + Number(j.shipping_cost ?? 0) + Number(j.other_cost ?? 0),
      0,
    );

    monthly.push({
      label: m.label,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
      revenue,
      cogs,
      grossProfit: revenue - cogs,
    });
  }

  const thisMonth = monthly[5];
  const lastMonth = monthly[4];

  // ---------- Totals (6-month) ----------
  const totalCashIn = monthly.reduce((s, m) => s + m.cashIn, 0);
  const totalCashOut = monthly.reduce((s, m) => s + m.cashOut, 0);
  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const totalCogs = monthly.reduce((s, m) => s + m.cogs, 0);

  // ---------- Expense breakdown by category (6-month) ----------
  const byCategory = new Map<string, number>();
  for (const e of allExpenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
  }
  const expenseByCategory = Array.from(byCategory.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    monthly,
    thisMonth,
    lastMonth,
    totals: {
      cashIn: totalCashIn,
      cashOut: totalCashOut,
      netCash: totalCashIn - totalCashOut,
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit: totalRevenue - totalCogs,
    },
    expenseByCategory,
    recentExpenses: (recentExpenses ?? []) as Expense[],
  };
}
