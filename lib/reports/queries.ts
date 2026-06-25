import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/database";

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

function toBangkok(date: Date) {
  return new Date(date.getTime() + TZ_OFFSET_MS);
}

export function getMonthBoundsBangkok(monthsAgo = 0) {
  const now = toBangkok(new Date());
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - monthsAgo;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return {
    start: new Date(start.getTime() - TZ_OFFSET_MS).toISOString(),
    end: new Date(end.getTime() - TZ_OFFSET_MS).toISOString(),
    label: start.toLocaleDateString("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" }),
  };
}

export function getYearStartBangkok(): string {
  const now = toBangkok(new Date());
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return new Date(start.getTime() - TZ_OFFSET_MS).toISOString();
}

export type FinanceRange = "this_month" | "3_months" | "ytd" | "all";

export function resolveRange(range: FinanceRange): { start: string; end: string; label: string } {
  const end = new Date().toISOString();
  switch (range) {
    case "this_month": {
      const m = getMonthBoundsBangkok(0);
      return { start: m.start, end: m.end, label: "เดือนนี้" };
    }
    case "3_months": {
      const start = getMonthBoundsBangkok(2).start;
      return { start, end, label: "3 เดือนล่าสุด" };
    }
    case "ytd":
      return { start: getYearStartBangkok(), end, label: "ตั้งแต่ต้นปี" };
    case "all":
    default:
      return { start: "1970-01-01T00:00:00Z", end, label: "ทั้งหมด" };
  }
}

export type ReportJob = Pick<
  Job,
  | "id" | "status" | "sale_price" | "discount" | "cost" | "shipping_cost" | "other_cost"
  | "quantity" | "received_at" | "due_date" | "updated_at" | "customer_id" | "factory_id"
> & {
  customers?: { name: string } | { name: string }[] | null;
  factories?: { name: string } | { name: string }[] | null;
  job_timeline?: { event_type: string; created_at: string }[];
};

function isClosed(j: ReportJob): boolean {
  return j.status === "shipped" || j.status === "completed";
}

function isCancelled(j: ReportJob): boolean {
  return j.status === "cancelled";
}

function netSale(j: ReportJob): number {
  return Math.max(0, Number(j.sale_price ?? 0) - Number(j.discount ?? 0));
}

function totalCost(j: ReportJob): number {
  return Number(j.cost ?? 0) + Number(j.shipping_cost ?? 0) + Number(j.other_cost ?? 0);
}

function profit(j: ReportJob): number {
  return netSale(j) - totalCost(j);
}

export function calcRevenue(jobs: ReportJob[]) {
  return jobs.filter((j) => !isCancelled(j)).reduce((sum, j) => sum + netSale(j), 0);
}
export function calcProfit(jobs: ReportJob[]) {
  return jobs.filter((j) => !isCancelled(j)).reduce((sum, j) => sum + profit(j), 0);
}
export function calcCost(jobs: ReportJob[]) {
  return jobs.filter((j) => !isCancelled(j)).reduce((sum, j) => sum + totalCost(j), 0);
}
export function calcDiscountGiven(jobs: ReportJob[]) {
  return jobs.filter((j) => !isCancelled(j)).reduce((sum, j) => sum + Number(j.discount ?? 0), 0);
}

export type MonthlyStat = {
  label: string;
  revenue: number;     // ยอดขายสุทธิจากงานที่ปิดเดือนนี้
  profit: number;      // กำไรจากงานที่ปิดเดือนนี้
  cost: number;        // ต้นทุนรวมของงานที่ปิดเดือนนี้
  discount: number;    // ส่วนลดที่ให้ในงานที่ปิดเดือนนี้
  cashIn: number;      // เงินสดเข้าเดือนนี้ (จาก payments)
  closedCount: number; // จำนวนงานที่ปิดเดือนนี้
  newCount: number;    // จำนวนงานใหม่ที่รับเดือนนี้
};

function aggregateMonth(
  monthJobsClosed: ReportJob[],
  monthJobsNew: ReportJob[],
  monthPayments: { type: string; amount: number }[],
  label: string,
): MonthlyStat {
  const cashIn = monthPayments.reduce(
    (sum, p) => sum + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)),
    0,
  );
  return {
    label,
    revenue: calcRevenue(monthJobsClosed),
    profit: calcProfit(monthJobsClosed),
    cost: calcCost(monthJobsClosed),
    discount: calcDiscountGiven(monthJobsClosed),
    cashIn,
    closedCount: monthJobsClosed.length,
    newCount: monthJobsNew.length,
  };
}

type AgingBuckets = {
  current: number;     // 0-30 days
  thirty: number;      // 31-60
  sixty: number;       // 61-90
  ninety: number;      // 90+
};

function bucketAging(days: number): keyof AgingBuckets {
  if (days <= 30) return "current";
  if (days <= 60) return "thirty";
  if (days <= 90) return "sixty";
  return "ninety";
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getReportData() {
  const supabase = await createClient();

  const sixMonthsBack = getMonthBoundsBangkok(5);
  const allTimeStart = sixMonthsBack.start;
  const yearStart = getYearStartBangkok();

  const [{ data: jobs }, { data: paymentsData }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, status, sale_price, discount, cost, shipping_cost, other_cost, quantity, received_at, due_date, updated_at, customer_id, factory_id, customers(name), factories(name)",
      )
      .or(`received_at.gte.${allTimeStart},updated_at.gte.${allTimeStart}`)
      .order("received_at", { ascending: false }),
    supabase.from("payments").select("type, amount, paid_at, job_id").gte("paid_at", allTimeStart),
  ]);

  const allJobs = (jobs ?? []) as ReportJob[];
  const allPayments = (paymentsData ?? []) as {
    type: string;
    amount: number;
    paid_at: string;
    job_id: string;
  }[];

  // ---------- Monthly stats (6 months) ----------
  const monthly: MonthlyStat[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = getMonthBoundsBangkok(i);
    const closed = allJobs.filter(
      (j) => isClosed(j) && j.updated_at >= m.start && j.updated_at < m.end,
    );
    const newOnes = allJobs.filter(
      (j) => j.received_at >= m.start && j.received_at < m.end,
    );
    const monthPayments = allPayments.filter((p) => p.paid_at >= m.start && p.paid_at < m.end);
    monthly.push(aggregateMonth(closed, newOnes, monthPayments, m.label));
  }
  const thisMonth = monthly[5];
  const lastMonth = monthly[4];

  // ---------- Year-to-date totals ----------
  const ytdJobsClosed = allJobs.filter((j) => isClosed(j) && j.updated_at >= yearStart);
  const ytdPayments = allPayments.filter((p) => p.paid_at >= yearStart);
  const ytd = {
    revenue: calcRevenue(ytdJobsClosed),
    profit: calcProfit(ytdJobsClosed),
    cost: calcCost(ytdJobsClosed),
    discount: calcDiscountGiven(ytdJobsClosed),
    cashIn: ytdPayments.reduce(
      (sum, p) => sum + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)),
      0,
    ),
    closedCount: ytdJobsClosed.length,
  };

  // ---------- Outstanding & Aging ----------
  const paidByJob = new Map<string, number>();
  for (const p of allPayments) {
    const cur = paidByJob.get(p.job_id) ?? 0;
    paidByJob.set(
      p.job_id,
      cur + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)),
    );
  }

  const now = new Date();
  const aging: AgingBuckets = { current: 0, thirty: 0, sixty: 0, ninety: 0 };
  let outstandingTotal = 0;
  const outstandingCustomers = new Map<string, { name: string; amount: number; oldestDays: number }>();

  for (const j of allJobs) {
    if (isCancelled(j)) continue;
    const paid = paidByJob.get(j.id) ?? 0;
    const remaining = netSale(j) - paid;
    if (remaining <= 0) continue;
    outstandingTotal += remaining;

    // Aging by received_at (when the JOB started)
    const days = daysBetween(now, new Date(j.received_at));
    const bucket = bucketAging(days);
    aging[bucket] += remaining;

    // Track top outstanding customers
    if (j.customer_id) {
      const cust = Array.isArray(j.customers) ? j.customers[0] : j.customers;
      const cur = outstandingCustomers.get(j.customer_id) ?? {
        name: cust?.name ?? "-",
        amount: 0,
        oldestDays: 0,
      };
      cur.amount += remaining;
      cur.oldestDays = Math.max(cur.oldestDays, days);
      outstandingCustomers.set(j.customer_id, cur);
    }
  }

  const overdueCustomers = Array.from(outstandingCustomers.entries())
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // ---------- Status distribution ----------
  const statusDistribution: Record<JobStatus, number> = {
    received: 0,
    designing: 0,
    awaiting_approval: 0,
    sent_to_factory: 0,
    producing: 0,
    qc: 0,
    ready_to_ship: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const j of allJobs) statusDistribution[j.status]++;

  // ---------- Top customers ----------
  const customerStats = new Map<
    string,
    { name: string; revenue: number; profit: number; count: number }
  >();
  for (const j of allJobs) {
    if (isCancelled(j) || !j.customer_id) continue;
    const cust = Array.isArray(j.customers) ? j.customers[0] : j.customers;
    const cur = customerStats.get(j.customer_id) ?? {
      name: cust?.name ?? "-",
      revenue: 0,
      profit: 0,
      count: 0,
    };
    cur.revenue += netSale(j);
    cur.profit += profit(j);
    cur.count++;
    customerStats.set(j.customer_id, cur);
  }
  const customerArr = Array.from(customerStats.entries()).map(([id, s]) => ({ id, ...s }));
  const topCustomers = customerArr.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topCustomersByProfit = customerArr.slice().sort((a, b) => b.profit - a.profit).slice(0, 5);

  // ---------- Top factories ----------
  const factoryStats = new Map<
    string,
    { name: string; jobs: number; cost: number; revenue: number; profit: number }
  >();
  for (const j of allJobs) {
    if (isCancelled(j) || !j.factory_id) continue;
    const fac = Array.isArray(j.factories) ? j.factories[0] : j.factories;
    const cur = factoryStats.get(j.factory_id) ?? {
      name: fac?.name ?? "-",
      jobs: 0,
      cost: 0,
      revenue: 0,
      profit: 0,
    };
    cur.jobs++;
    cur.cost += totalCost(j);
    cur.revenue += netSale(j);
    cur.profit += profit(j);
    factoryStats.set(j.factory_id, cur);
  }
  const topFactories = Array.from(factoryStats.entries())
    .map(([id, s]) => ({
      id,
      ...s,
      margin: s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 5);

  // ---------- Operations ----------
  const todayISO = new Date().toISOString().slice(0, 10);
  const overdue = allJobs.filter(
    (j) =>
      j.due_date &&
      j.due_date < todayISO &&
      !isClosed(j) &&
      !isCancelled(j),
  );

  // Completion rate (over last 6 months): closed / (closed + cancelled)
  const ytdClosed = ytdJobsClosed.length;
  const ytdCancelled = allJobs.filter(
    (j) => isCancelled(j) && j.updated_at >= yearStart,
  ).length;
  const completionRate =
    ytdClosed + ytdCancelled > 0 ? (ytdClosed / (ytdClosed + ytdCancelled)) * 100 : 0;

  // Average production days for closed jobs
  const productionDays = ytdJobsClosed
    .map((j) => daysBetween(new Date(j.updated_at), new Date(j.received_at)))
    .filter((d) => d >= 0);
  const avgProductionDays =
    productionDays.length > 0
      ? productionDays.reduce((s, d) => s + d, 0) / productionDays.length
      : 0;

  const activeJobs = allJobs.filter(
    (j) => !isClosed(j) && !isCancelled(j),
  ).length;

  return {
    monthly,
    thisMonth,
    lastMonth,
    ytd,
    outstanding: {
      total: outstandingTotal,
      aging,
      customers: overdueCustomers,
    },
    statusDistribution,
    topCustomers,
    topCustomersByProfit,
    topFactories,
    overdueCount: overdue.length,
    totalJobsLast6Months: allJobs.length,
    operations: {
      completionRate,
      avgProductionDays,
      activeJobs,
      cancelledYtd: ytdCancelled,
    },
  };
}

export function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
