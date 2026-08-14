import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types/database";

export type CollectStatus = "unpaid" | "partial" | "paid";

export type ReceivableJob = {
  id: string;
  jobCode: string;
  jobLabel: string | null;
  customerName: string;
  status: JobStatus;
  dueDate: string | null;
  net: number;      // ยอดที่ต้องเก็บ (ราคาขาย − ส่วนลด)
  paid: number;     // เก็บแล้ว (สุทธิ)
  remaining: number;// ค้างเก็บ
  hasDeposit: boolean;
  collect: CollectStatus;
};

type JobRow = {
  id: string;
  job_code: string;
  job_label: string | null;
  status: JobStatus;
  sale_price: number;
  discount: number;
  due_date: string | null;
  customers: { name: string } | { name: string }[] | null;
};

function nameOf(c: JobRow["customers"]): string {
  if (!c) return "—";
  const o = Array.isArray(c) ? c[0] : c;
  return o?.name ?? "—";
}

export async function getReceivables() {
  const supabase = await createClient();

  const [{ data: jobs }, { data: payments }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, job_code, job_label, status, sale_price, discount, due_date, customers(name)")
      .neq("status", "cancelled")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("payments").select("job_id, type, amount"),
  ]);

  const js = (jobs ?? []) as JobRow[];
  const pays = (payments ?? []) as { job_id: string; type: string; amount: number }[];

  // รวมเงินที่จ่ายต่องาน + มีมัดจำไหม
  const paidByJob = new Map<string, number>();
  const depositByJob = new Map<string, number>();
  for (const p of pays) {
    const signed = p.type === "refund" ? -Number(p.amount) : Number(p.amount);
    paidByJob.set(p.job_id, (paidByJob.get(p.job_id) ?? 0) + signed);
    if (p.type === "deposit") depositByJob.set(p.job_id, (depositByJob.get(p.job_id) ?? 0) + Number(p.amount));
  }

  const unpaid: ReceivableJob[] = [];
  const partial: ReceivableJob[] = [];
  const paidList: ReceivableJob[] = [];

  for (const j of js) {
    const net = Math.max(0, Number(j.sale_price ?? 0) - Number(j.discount ?? 0));
    if (net <= 0) continue; // ไม่มียอด — ข้าม
    const paid = paidByJob.get(j.id) ?? 0;
    const remaining = Math.max(0, net - paid);
    const hasDeposit = (depositByJob.get(j.id) ?? 0) > 0;

    let collect: CollectStatus;
    if (paid <= 0) collect = "unpaid";
    else if (paid < net) collect = "partial";
    else collect = "paid";

    const row: ReceivableJob = {
      id: j.id,
      jobCode: j.job_code,
      jobLabel: j.job_label,
      customerName: nameOf(j.customers),
      status: j.status,
      dueDate: j.due_date,
      net,
      paid,
      remaining,
      hasDeposit,
      collect,
    };

    if (collect === "unpaid") unpaid.push(row);
    else if (collect === "partial") partial.push(row);
    else paidList.push(row);
  }

  // ยังเก็บไม่ครบ → เรียงตามยอดค้างมากสุด
  unpaid.sort((a, b) => b.remaining - a.remaining);
  partial.sort((a, b) => b.remaining - a.remaining);

  const sum = (arr: ReceivableJob[], key: "net" | "paid" | "remaining") =>
    arr.reduce((s, r) => s + r[key], 0);

  return {
    unpaid,
    partial,
    paid: paidList,
    totals: {
      unpaidCount: unpaid.length,
      partialCount: partial.length,
      paidCount: paidList.length,
      unpaidRemaining: sum(unpaid, "remaining"),
      partialRemaining: sum(partial, "remaining"),
      partialCollected: sum(partial, "paid"),
      outstandingTotal: sum(unpaid, "remaining") + sum(partial, "remaining"),
      collectedTotal: sum(paidList, "paid") + sum(partial, "paid"),
    },
  };
}
