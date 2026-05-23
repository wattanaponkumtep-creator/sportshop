import { NextResponse, type NextRequest } from "next/server";
import { sendDailyDigestToAllAdmins } from "@/lib/jobs/daily-digest";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron endpoint — invoked by schedule in vercel.json.
 * Vercel adds Authorization: Bearer <CRON_SECRET> when invoking cron jobs (optional but recommended).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret if set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const result = await sendDailyDigestToAllAdmins();
  return NextResponse.json(result);
}
