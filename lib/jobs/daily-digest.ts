import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { pushLineMessage, isLineConfigured } from "@/lib/line/client";
import { JOB_STATUS_LABEL } from "@/lib/constants";

export async function buildAdminDigestMessage(): Promise<string> {
  const supabase = createServiceClient();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86400000);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("job_code, status, due_date, sale_price, customers(name)")
    .not("status", "in", '("completed","cancelled")')
    .limit(500);

  const allJobs = (jobs ?? []) as Array<{
    job_code: string;
    status: string;
    due_date: string | null;
    sale_price: number;
    customers: { name: string } | null;
  }>;

  const dueToday = allJobs.filter((j) => j.due_date === todayISO);
  const dueTomorrow = allJobs.filter((j) => j.due_date === tomorrowISO);
  const overdue = allJobs.filter((j) => j.due_date && j.due_date < todayISO);
  const awaitingApproval = allJobs.filter((j) => j.status === "awaiting_approval");

  const dateStr = today.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Bangkok",
  });

  const lines: string[] = [
    `📅 สรุปประจำวัน — ${dateStr}`,
    "",
    `📊 งานทั้งหมดที่ active: ${allJobs.length} งาน`,
    "",
  ];

  if (overdue.length > 0) {
    lines.push(`⚠️ เลยกำหนด ${overdue.length} งาน:`);
    overdue.slice(0, 5).forEach((j) => {
      lines.push(`  • ${j.job_code} — ${j.customers?.name ?? "-"} (กำหนด ${j.due_date})`);
    });
    if (overdue.length > 5) lines.push(`  ... และอีก ${overdue.length - 5} งาน`);
    lines.push("");
  }

  if (dueToday.length > 0) {
    lines.push(`🔥 ส่งวันนี้ ${dueToday.length} งาน:`);
    dueToday.forEach((j) => {
      lines.push(`  • ${j.job_code} — ${j.customers?.name ?? "-"} [${JOB_STATUS_LABEL[j.status as keyof typeof JOB_STATUS_LABEL] ?? j.status}]`);
    });
    lines.push("");
  }

  if (dueTomorrow.length > 0) {
    lines.push(`⏰ ส่งพรุ่งนี้ ${dueTomorrow.length} งาน:`);
    dueTomorrow.forEach((j) => {
      lines.push(`  • ${j.job_code} — ${j.customers?.name ?? "-"} [${JOB_STATUS_LABEL[j.status as keyof typeof JOB_STATUS_LABEL] ?? j.status}]`);
    });
    lines.push("");
  }

  if (awaitingApproval.length > 0) {
    lines.push(`👀 รออนุมัติ Mockup ${awaitingApproval.length} งาน:`);
    awaitingApproval.slice(0, 3).forEach((j) => {
      lines.push(`  • ${j.job_code} — ${j.customers?.name ?? "-"}`);
    });
    if (awaitingApproval.length > 3) lines.push(`  ... และอีก ${awaitingApproval.length - 3} งาน`);
    lines.push("");
  }

  if (overdue.length === 0 && dueToday.length === 0 && dueTomorrow.length === 0 && awaitingApproval.length === 0) {
    lines.push("🎉 วันนี้ไม่มีงานเร่งด่วน!");
    lines.push("");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  lines.push(`🔗 เปิด Dashboard: ${siteUrl}/dashboard`);

  return lines.join("\n");
}

/**
 * Send daily digest to all recipients:
 *   1. admins who have line_user_id_personal set (users table)
 *   2. extra recipients in digest_recipients table (หลายไอดี)
 * De-duplicated by LINE user ID.
 */
export async function sendDailyDigestToAllAdmins() {
  if (!isLineConfigured()) {
    return { ok: false as const, error: "LINE OA not configured" };
  }

  const supabase = createServiceClient();

  const [{ data: admins }, { data: recipients }] = await Promise.all([
    supabase
      .from("users")
      .select("line_user_id_personal, name")
      .not("line_user_id_personal", "is", null)
      .eq("is_active", true),
    supabase
      .from("digest_recipients")
      .select("line_user_id, name")
      .eq("is_active", true),
  ]);

  // รวม + ลบ ID ซ้ำ
  const byId = new Map<string, string | null>(); // line_user_id → name
  for (const a of (admins ?? []) as Array<{ line_user_id_personal: string; name: string | null }>) {
    if (a.line_user_id_personal) byId.set(a.line_user_id_personal, a.name);
  }
  for (const r of (recipients ?? []) as Array<{ line_user_id: string; name: string | null }>) {
    if (r.line_user_id && !byId.has(r.line_user_id)) byId.set(r.line_user_id, r.name);
  }

  const targets = Array.from(byId.entries()).map(([line_user_id, name]) => ({ line_user_id, name }));

  if (targets.length === 0) {
    return { ok: false as const, error: "ยังไม่มีผู้รับ — เพิ่ม LINE ID ใน Settings" };
  }

  const message = await buildAdminDigestMessage();

  let sent = 0;
  const failures: string[] = [];

  for (const t of targets) {
    const result = await pushLineMessage(t.line_user_id, [{ type: "text", text: message }]);
    if (result.ok) sent++;
    else failures.push(`${t.name ?? t.line_user_id}: ${result.error}`);

    await supabase.from("notifications").insert({
      customer_id: null,
      channel: "line_oa",
      template: "admin_daily_digest",
      payload: { user_id: t.line_user_id, text: message },
      status: result.ok ? "sent" : "failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  }

  return { ok: true as const, sent, total: targets.length, failures: failures.length > 0 ? failures : undefined };
}
