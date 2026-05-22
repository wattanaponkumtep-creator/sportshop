import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types/database";

export type FollowupSuggestion = {
  job_id: string;
  job_code: string;
  customer_id: string;
  customer_name: string;
  status: JobStatus;
  reason: string;
  level: "urgent" | "warning" | "info";
  detail: string;
};

export async function getFollowupSuggestions(): Promise<FollowupSuggestion[]> {
  const supabase = await createClient();

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const threeDaysAgoISO = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgoISO = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, job_code, status, due_date, sale_price, received_at, updated_at, customer_id, customers(name)")
    .not("status", "in", '("completed","cancelled")')
    .limit(500);

  if (!jobs || jobs.length === 0) return [];

  const suggestions: FollowupSuggestion[] = [];

  // Fetch payments and timeline events for these jobs
  const jobIds = jobs.map((j) => j.id as string);
  const [{ data: payments }, { data: lastEvents }] = await Promise.all([
    supabase.from("payments").select("job_id, type, amount").in("job_id", jobIds),
    supabase
      .from("job_timeline")
      .select("job_id, created_at")
      .in("job_id", jobIds)
      .order("created_at", { ascending: false }),
  ]);

  const paidByJob = new Map<string, number>();
  for (const p of (payments ?? []) as { job_id: string; type: string; amount: number }[]) {
    const cur = paidByJob.get(p.job_id) ?? 0;
    paidByJob.set(p.job_id, cur + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)));
  }

  const lastEventByJob = new Map<string, string>();
  for (const ev of (lastEvents ?? []) as { job_id: string; created_at: string }[]) {
    if (!lastEventByJob.has(ev.job_id)) {
      lastEventByJob.set(ev.job_id, ev.created_at);
    }
  }

  for (const j of jobs) {
    const customer = (j.customers as { name: string } | null);
    const customerName = customer?.name ?? "-";
    const paid = paidByJob.get(j.id as string) ?? 0;
    const balance = Number(j.sale_price ?? 0) - paid;
    const lastEvent = lastEventByJob.get(j.id as string) ?? j.received_at;

    // 1. OVERDUE: Job is past due date
    if (j.due_date && (j.due_date as string) < todayISO) {
      suggestions.push({
        job_id: j.id as string,
        job_code: j.job_code as string,
        customer_id: j.customer_id as string,
        customer_name: customerName,
        status: j.status as JobStatus,
        reason: "เลยกำหนดส่ง",
        level: "urgent",
        detail: `กำหนดส่ง ${j.due_date} แต่ยังไม่ส่ง`,
      });
      continue;
    }

    // 2. AWAITING APPROVAL > 1 day
    if (j.status === "awaiting_approval" && (j.updated_at as string) < oneDayAgoISO) {
      suggestions.push({
        job_id: j.id as string,
        job_code: j.job_code as string,
        customer_id: j.customer_id as string,
        customer_name: customerName,
        status: j.status as JobStatus,
        reason: "ลูกค้ายังไม่อนุมัติ Mockup",
        level: "warning",
        detail: `ส่ง Mockup เกิน 1 วันแล้ว ยังไม่ตอบกลับ`,
      });
      continue;
    }

    // 3. NO ACTIVITY for 3+ days (and not yet shipped)
    if (lastEvent < threeDaysAgoISO && !["shipped", "completed"].includes(j.status as string)) {
      suggestions.push({
        job_id: j.id as string,
        job_code: j.job_code as string,
        customer_id: j.customer_id as string,
        customer_name: customerName,
        status: j.status as JobStatus,
        reason: "ไม่มีอัปเดต > 3 วัน",
        level: "warning",
        detail: `ยังคงสถานะ ${j.status} ตั้งแต่ ${new Date(lastEvent).toLocaleDateString("th-TH")}`,
      });
      continue;
    }

    // 4. SHIPPED but balance > 0
    if (j.status === "shipped" && balance > 0) {
      suggestions.push({
        job_id: j.id as string,
        job_code: j.job_code as string,
        customer_id: j.customer_id as string,
        customer_name: customerName,
        status: j.status as JobStatus,
        reason: "ค้างชำระหลังส่งของ",
        level: "info",
        detail: `ส่งของแล้ว ยังค้างชำระ ${balance.toLocaleString("th-TH")} บาท`,
      });
    }
  }

  // Sort by level: urgent > warning > info
  const levelRank = { urgent: 0, warning: 1, info: 2 };
  suggestions.sort((a, b) => levelRank[a.level] - levelRank[b.level]);

  return suggestions.slice(0, 10);
}
