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
 * Send daily digest to all admins who have line_user_id_personal set.
 */
export async function sendDailyDigestToAllAdmins() {
  if (!isLineConfigured()) {
    return { ok: false as const, error: "LINE OA not configured" };
  }

  const supabase = createServiceClient();
  const { data: admins } = await supabase
    .from("users")
    .select("id, line_user_id_personal, name")
    .not("line_user_id_personal", "is", null)
    .eq("is_active", true);

  const targets = (admins ?? []) as Array<{ id: string; line_user_id_personal: string; name: string | null }>;

  if (targets.length === 0) {
    return { ok: false as const, error: "ยังไม่มี admin ใส่ LINE personal ID" };
  }

  const message = await buildAdminDigestMessage();

  let sent = 0;
  const failures: string[] = [];

  for (const admin of targets) {
    const result = await pushLineMessage(admin.line_user_id_personal, [{ type: "text", text: message }]);
    if (result.ok) sent++;
    else failures.push(`${admin.name ?? admin.id}: ${result.error}`);

    await supabase.from("notifications").insert({
      customer_id: null,
      channel: "line_oa",
      template: "admin_daily_digest",
      payload: { user_id: admin.line_user_id_personal, text: message },
      status: result.ok ? "sent" : "failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  }

  return { ok: true as const, sent, total: targets.length, failures: failures.length > 0 ? failures : undefined };
}
