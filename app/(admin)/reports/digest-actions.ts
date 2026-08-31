"use server";
import { sendMonthlyClosingToLine } from "@/lib/reports/monthly-closing-digest";

// ส่งสรุปสิ้นเดือน (เดือนที่เพิ่งจบ) เข้า LINE ทันที — สำหรับทดสอบ/ส่งเอง
export async function sendMonthlyClosingNow() {
  return await sendMonthlyClosingToLine(1);
}
