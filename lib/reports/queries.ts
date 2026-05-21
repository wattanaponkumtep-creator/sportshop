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

export type ReportJob = Pick<
  Job,
  "id" | "status" | "sale_price" | "cost" | "shipping_cost" | "other_cost" | "quantity" | "received_at" | "due_date" | "customer_id" | "factory_id"
> & {
  customers?: { name: string } | { name: string }[] | null;
  factories?: { name: string } | { name: string }[] | null;
  job_timeline?: { event_type: string; created_at: string }[];
};

export function calcRevenue(jobs: ReportJob[]) {
  return jobs
    .filter((j) => j.status !== "cancelled")
    .reduce((sum, j) => sum + Number(j.sale_price ?? 0), 0);
}

export function calcProfit(jobs: ReportJob[]) {
  return jobs
    .filter((j) => j.status !== "cancelled")
    .reduce(
      (sum, j) =>
        sum +
        Number(j.sale_price ?? 0) -
        Number(j.cost ?? 0) -
        Number(j.shipping_cost ?? 0) -
        Number(j.other_cost ?? 0),
      0
    );
}

export function countCompleted(jobs: ReportJob[]) {
  return jobs.filter((j) => j.status === "completed" || j.status === "shipped").length;
}

export async function getReportData() {
  const supabase = await createClient();

  const sixMonthsBack = getMonthBoundsBangkok(5);
  const allTimeStart = sixMonthsBack.start;

  const [{ data: jobs }, { data: paymentsData }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, status, sale_price, cost, shipping_cost, other_cost, quantity, received_at, due_date, customer_id, factory_id, customers(name), factories(name)"
      )
      .gte("received_at", allTimeStart)
      .order("received_at", { ascending: false }),
    supabase
      .from("payments")
      .select("type, amount, paid_at, job_id")
      .gte("paid_at", allTimeStart),
  ]);

  const allJobs = (jobs ?? []) as ReportJob[];
  const allPayments = (paymentsData ?? []) as { type: string; amount: number; paid_at: string; job_id: string }[];

  const monthly: { label: string; revenue: number; profit: number; count: number; cashIn: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = getMonthBoundsBangkok(i);
    const monthJobs = allJobs.filter(
      (j) => j.received_at >= m.start && j.received_at < m.end
    );
    const monthPayments = allPayments.filter(
      (p) => p.paid_at >= m.start && p.paid_at < m.end
    );
    const cashIn = monthPayments.reduce(
      (sum, p) => sum + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)),
      0
    );
    monthly.push({
      label: m.label,
      revenue: calcRevenue(monthJobs),
      profit: calcProfit(monthJobs),
      count: monthJobs.length,
      cashIn,
    });
  }

  const paidByJob = new Map<string, number>();
  for (const p of allPayments) {
    const cur = paidByJob.get(p.job_id) ?? 0;
    paidByJob.set(p.job_id, cur + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)));
  }

  let outstandingTotal = 0;
  for (const j of allJobs) {
    if (j.status === "cancelled") continue;
    const paid = paidByJob.get(j.id) ?? 0;
    const remaining = Number(j.sale_price ?? 0) - paid;
    if (remaining > 0) outstandingTotal += remaining;
  }

  const thisMonth = monthly[5];
  const lastMonth = monthly[4];

  const statusDistribution: Record<JobStatus, number> = {
    received: 0, designing: 0, awaiting_approval: 0, sent_to_factory: 0,
    producing: 0, qc: 0, ready_to_ship: 0, shipped: 0, completed: 0, cancelled: 0,
  };
  for (const j of allJobs) statusDistribution[j.status]++;

  const customerStats = new Map<string, { name: string; revenue: number; count: number }>();
  for (const j of allJobs) {
    if (j.status === "cancelled") continue;
    if (!j.customer_id) continue;
    const cust = Array.isArray(j.customers) ? j.customers[0] : j.customers;
    const cur = customerStats.get(j.customer_id) ?? { name: cust?.name ?? "-", revenue: 0, count: 0 };
    cur.revenue += Number(j.sale_price ?? 0);
    cur.count++;
    customerStats.set(j.customer_id, cur);
  }
  const topCustomers = Array.from(customerStats.entries())
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const factoryStats = new Map<string, { name: string; jobs: number; cost: number }>();
  for (const j of allJobs) {
    if (j.status === "cancelled") continue;
    if (!j.factory_id) continue;
    const fac = Array.isArray(j.factories) ? j.factories[0] : j.factories;
    const cur = factoryStats.get(j.factory_id) ?? { name: fac?.name ?? "-", jobs: 0, cost: 0 };
    cur.jobs++;
    cur.cost += Number(j.cost ?? 0);
    factoryStats.set(j.factory_id, cur);
  }
  const topFactories = Array.from(factoryStats.entries())
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 5);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = allJobs.filter(
    (j) => j.due_date && j.due_date < today && j.status !== "completed" && j.status !== "shipped" && j.status !== "cancelled"
  );

  return {
    monthly,
    thisMonth,
    lastMonth,
    statusDistribution,
    topCustomers,
    topFactories,
    overdueCount: overdue.length,
    totalJobsLast6Months: allJobs.length,
    outstandingTotal,
  };
}

export function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
