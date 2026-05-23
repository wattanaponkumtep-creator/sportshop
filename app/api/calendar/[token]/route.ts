import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { buildJobsCalendar } from "@/lib/calendar/ics";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify token belongs to an active user
  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, is_active")
    .eq("calendar_token", token)
    .maybeSingle();

  const u = user as { id: string; name: string | null; email: string; is_active: boolean } | null;

  if (!u || !u.is_active) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch all active jobs (not completed or cancelled) with due_date
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, job_code, status, product_type, quantity, due_date, received_at, track_token, customers(name)")
    .not("status", "in", '("completed","cancelled")')
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(500);

  const jobEvents = (jobs ?? []).map((j) => {
    const cust = (j.customers as { name: string } | null)?.name ?? "-";
    return {
      id: j.id as string,
      job_code: j.job_code as string,
      status: j.status,
      product_type: j.product_type as string | null,
      quantity: j.quantity as number,
      due_date: j.due_date as string | null,
      received_at: j.received_at as string,
      track_token: j.track_token as string,
      customer_name: cust,
    };
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const ics = buildJobsCalendar(jobEvents, siteUrl, u.name ?? u.email);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300, must-revalidate",
      "Content-Disposition": `inline; filename="sportshop-jobs.ics"`,
    },
  });
}
