import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { pushLineMessage, isLineConfigured } from "@/lib/line/client";
import { getMonthBoundsBangkok } from "@/lib/reports/queries";

const COGS_CATEGORIES = ["factory", "material", "shipping"];
const baht = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");

// สรุป P&L ของ "เดือนที่เพิ่งจบ" (monthsAgo=1) ตามเกณฑ์เดือนที่เริ่มงาน
export async function buildMonthlyClosingMessage(monthsAgo = 1): Promise<string> {
  const supabase = createServiceClient();
  const m = getMonthBoundsBangkok(monthsAgo);

  const [{ data: jobs }, { data: expenses }, { data: payments }] = await Promise.all([
    supabase
      .from("jobs")
      .select("sale_price, discount, cost, shipping_cost, other_cost, received_at")
      .in("status", ["shipped", "completed"])
      .gte("received_at", m.start)
      .lt("received_at", m.end),
    supabase.from("expenses").select("category, amount, paid_at").gte("paid_at", m.start).lt("paid_at", m.end),
    supabase.from("payments").select("type, amount, paid_at").gte("paid_at", m.start).lt("paid_at", m.end),
  ]);

  const js = (jobs ?? []) as Array<{ sale_price: number; discount: number; cost: number; shipping_cost: number; other_cost: number }>;
  const exps = (expenses ?? []) as Array<{ category: string; amount: number }>;
  const pays = (payments ?? []) as Array<{ type: string; amount: number }>;

  const revenue = js.reduce((s, j) => s + Math.max(0, Number(j.sale_price ?? 0) - Number(j.discount ?? 0)), 0);
  const cogs = js.reduce((s, j) => s + Number(j.cost ?? 0) + Number(j.shipping_cost ?? 0) + Number(j.other_cost ?? 0), 0);
  const grossProfit = revenue - cogs;
  const operating = exps.filter((e) => !COGS_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = grossProfit - operating;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const cashIn = pays.reduce((s, p) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)), 0);
  const cashOut = exps.reduce((s, e) => s + Number(e.amount), 0);

  // ป้ายเดือนแบบเต็ม (พ.ศ.)
  const monthDate = new Date(m.start);
  const monthLabel = monthDate.toLocaleDateString("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  return [
    `📒 สรุปบัญชีสิ้นเดือน — ${monthLabel}`,
    "━━━━━━━━━━━━━━",
    `💰 รายได้: ${baht(revenue)}`,
    `📦 ต้นทุนงาน: ${baht(cogs)}`,
    `= กำไรขั้นต้น: ${baht(grossProfit)}`,
    `🏪 ค่าใช้จ่ายร้าน: ${baht(operating)}`,
    "━━━━━━━━━━━━━━",
    `${netProfit >= 0 ? "✅" : "⚠️"} กำไรสุทธิ: ${baht(netProfit)} (Margin ${margin.toFixed(1)}%)`,
    "",
    `📊 งานที่เริ่มเดือนนี้และปิดแล้ว: ${js.length} งาน`,
    "",
    "💵 กระแสเงินสด",
    `  เข้า ${baht(cashIn)} · ออก ${baht(cashOut)} · สุทธิ ${cashIn - cashOut >= 0 ? "+" : "-"}${baht(Math.abs(cashIn - cashOut))}`,
    "",
    `🔗 ดูละเอียด/ดาวน์โหลด Excel-PDF: ${siteUrl}/reports/finance`,
  ].join("\n");
}

// ส่งสรุปสิ้นเดือนให้ผู้รับทุกคน (เหมือน daily digest)
export async function sendMonthlyClosingToLine(monthsAgo = 1) {
  if (!isLineConfigured()) return { ok: false as const, error: "LINE OA not configured" };

  const supabase = createServiceClient();
  const [{ data: admins }, { data: recipients }] = await Promise.all([
    supabase.from("users").select("line_user_id_personal, name").not("line_user_id_personal", "is", null).eq("is_active", true),
    supabase.from("digest_recipients").select("line_user_id, name").eq("is_active", true),
  ]);

  const byId = new Map<string, string | null>();
  for (const a of (admins ?? []) as Array<{ line_user_id_personal: string; name: string | null }>) {
    if (a.line_user_id_personal) byId.set(a.line_user_id_personal, a.name);
  }
  for (const r of (recipients ?? []) as Array<{ line_user_id: string; name: string | null }>) {
    if (r.line_user_id && !byId.has(r.line_user_id)) byId.set(r.line_user_id, r.name);
  }
  const targets = Array.from(byId.keys());
  if (targets.length === 0) return { ok: false as const, error: "ยังไม่มีผู้รับ — เพิ่ม LINE ID ใน Settings" };

  const message = await buildMonthlyClosingMessage(monthsAgo);

  let sent = 0;
  const failures: string[] = [];
  for (const id of targets) {
    const result = await pushLineMessage(id, [{ type: "text", text: message }]);
    if (result.ok) sent++;
    else failures.push(`${id}: ${result.error}`);

    await supabase.from("notifications").insert({
      customer_id: null,
      channel: "line_oa",
      template: "monthly_closing",
      payload: { user_id: id, text: message },
      status: result.ok ? "sent" : "failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  }

  return { ok: true as const, sent, total: targets.length, failures: failures.length > 0 ? failures : undefined };
}
