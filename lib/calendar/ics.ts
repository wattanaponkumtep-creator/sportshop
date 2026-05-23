import { JOB_STATUS_LABEL } from "@/lib/constants";
import type { JobStatus } from "@/lib/types/database";

type JobEvent = {
  id: string;
  job_code: string;
  status: JobStatus;
  product_type: string | null;
  quantity: number;
  due_date: string | null;
  received_at: string;
  track_token: string;
  customer_name: string;
};

const TZ = "Asia/Bangkok";

/**
 * Format date as ICS DATE value (YYYYMMDD) for all-day events
 */
function formatDate(dateStr: string): string {
  // dateStr from DB might be "2026-05-22" or full ISO
  return dateStr.slice(0, 10).replace(/-/g, "");
}

/**
 * Format datetime as ICS DATE-TIME (UTC, YYYYMMDDTHHMMSSZ)
 */
function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return (
    d.getUTCFullYear().toString().padStart(4, "0") +
    (d.getUTCMonth() + 1).toString().padStart(2, "0") +
    d.getUTCDate().toString().padStart(2, "0") +
    "T" +
    d.getUTCHours().toString().padStart(2, "0") +
    d.getUTCMinutes().toString().padStart(2, "0") +
    d.getUTCSeconds().toString().padStart(2, "0") +
    "Z"
  );
}

/**
 * Escape ICS text fields
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Wrap long lines at 75 chars (per RFC 5545)
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      chunks.push(line.slice(0, 75));
      i = 75;
    } else {
      chunks.push(" " + line.slice(i, i + 74));
      i += 74;
    }
  }
  return chunks.join("\r\n");
}

export function buildJobsCalendar(jobs: JobEvent[], siteUrl: string, ownerName: string): string {
  const now = formatDateTime(new Date().toISOString());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SportShop//Jobs Calendar//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:SportShop — ${ownerName}`,
    "X-WR-CALDESC:งานทั้งหมดของร้าน SportShop พร้อมกำหนดส่ง",
    `X-WR-TIMEZONE:${TZ}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];

  for (const j of jobs) {
    // Skip jobs without due_date — they don't go on calendar
    if (!j.due_date) continue;

    const url = `${siteUrl}/jobs/${j.id}`;
    const trackUrl = `${siteUrl}/track/${j.track_token}`;

    const title = `${j.job_code} — ${j.customer_name}`;
    const desc = [
      `ลูกค้า: ${j.customer_name}`,
      `จำนวน: ${j.quantity} ตัว`,
      `ประเภท: ${j.product_type ?? "-"}`,
      `สถานะ: ${JOB_STATUS_LABEL[j.status]}`,
      ``,
      `เปิดในระบบ: ${url}`,
      `ลิงก์ติดตามลูกค้า: ${trackUrl}`,
    ].join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      foldLine(`UID:job-${j.id}@sportshop`),
      foldLine(`SUMMARY:📦 ${escapeText(title)}`),
      foldLine(`DESCRIPTION:${escapeText(desc).replace(/\\\\n/g, "\\n")}`),
      foldLine(`URL:${url}`),
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatDate(j.due_date)}`,
      // All-day event = end is next day
      `DTEND;VALUE=DATE:${formatDate(new Date(new Date(j.due_date).getTime() + 86400000).toISOString())}`,
      `CATEGORIES:${escapeText(JOB_STATUS_LABEL[j.status])}`,
      // Add reminder 1 day before
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:🔔 พรุ่งนี้กำหนดส่ง ${escapeText(j.job_code)}`,
      "TRIGGER:-P1D",
      "END:VALARM",
      // Reminder same day
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:📦 วันนี้ส่ง ${escapeText(j.job_code)}`,
      "TRIGGER:PT9H",
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
