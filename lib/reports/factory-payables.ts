import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types/database";

// สถานะที่ถือว่า "ส่งโรงงานแล้ว" ขึ้นไป = ต้องจ่ายค่าผลิต
export const FACTORY_COMMITTED_STATUSES: JobStatus[] = [
  "sent_to_factory",
  "producing",
  "qc",
  "ready_to_ship",
  "shipped",
  "completed",
];

type PayableJobRow = {
  id: string;
  job_code: string;
  job_label: string | null;
  status: JobStatus;
  cost: number;
  due_date: string | null;
  updated_at: string;
  factory_cost_paid_at: string | null;
  factory_id: string | null;
  customers: { name: string } | { name: string }[] | null;
  factories: { name: string } | { name: string }[] | null;
};

export type PayableJob = {
  id: string;
  jobCode: string;
  jobLabel: string | null;
  customerName: string;
  status: JobStatus;
  cost: number;
  dueDate: string | null;
  paidAt: string | null;
};

export type FactoryGroup = {
  factoryId: string | null;
  factoryName: string;
  jobs: PayableJob[];
  total: number;
};

function nameOf(v: { name: string } | { name: string }[] | null | undefined): string {
  if (!v) return "";
  const o = Array.isArray(v) ? v[0] : v;
  return o?.name ?? "";
}

export async function getFactoryPayables() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select(
      "id, job_code, job_label, status, cost, due_date, updated_at, factory_cost_paid_at, factory_id, customers(name), factories(name)",
    )
    .in("status", FACTORY_COMMITTED_STATUSES)
    .gt("cost", 0)
    .order("due_date", { ascending: true, nullsFirst: false });

  const rows = (data ?? []) as PayableJobRow[];

  const toPayable = (r: PayableJobRow): PayableJob => ({
    id: r.id,
    jobCode: r.job_code,
    jobLabel: r.job_label,
    customerName: nameOf(r.customers) || "—",
    status: r.status,
    cost: Number(r.cost ?? 0),
    dueDate: r.due_date,
    paidAt: r.factory_cost_paid_at,
  });

  // ---------- ยังไม่จ่าย → จัดกลุ่มตามโรงงาน ----------
  const unpaidRows = rows.filter((r) => !r.factory_cost_paid_at);
  const groupMap = new Map<string, FactoryGroup>();
  for (const r of unpaidRows) {
    const key = r.factory_id ?? "_none";
    const g = groupMap.get(key) ?? {
      factoryId: r.factory_id,
      factoryName: nameOf(r.factories) || "ยังไม่ระบุโรงงาน",
      jobs: [],
      total: 0,
    };
    g.jobs.push(toPayable(r));
    g.total += Number(r.cost ?? 0);
    groupMap.set(key, g);
  }
  const groups = Array.from(groupMap.values()).sort((a, b) => b.total - a.total);
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const unpaidCount = unpaidRows.length;

  // ---------- จ่ายแล้วล่าสุด (สำหรับ undo / ตรวจสอบ) ----------
  const paidRecent = rows
    .filter((r) => r.factory_cost_paid_at)
    .sort((a, b) => (b.factory_cost_paid_at ?? "").localeCompare(a.factory_cost_paid_at ?? ""))
    .slice(0, 15)
    .map((r) => ({ ...toPayable(r), factoryName: nameOf(r.factories) || "ยังไม่ระบุโรงงาน" }));

  const paidTotal = rows
    .filter((r) => r.factory_cost_paid_at)
    .reduce((s, r) => s + Number(r.cost ?? 0), 0);

  return { groups, grandTotal, unpaidCount, paidRecent, paidTotal };
}
