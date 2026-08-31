import { NextResponse, type NextRequest } from "next/server";
import { sendMonthlyClosingToLine } from "@/lib/reports/monthly-closing-digest";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron — ยิงวันที่ 1 ของทุกเดือน (ตั้งใน vercel.json)
 * สรุป P&L ของ "เดือนที่เพิ่งจบ" ส่งเข้า LINE ผู้รับทุกคน
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const result = await sendMonthlyClosingToLine(1);
  return NextResponse.json(result);
}
