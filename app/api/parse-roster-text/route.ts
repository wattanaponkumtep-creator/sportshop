import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRosterText } from "@/lib/parser/ai-text-roster";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !(profile as { is_active: boolean }).is_active) {
    return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
  }

  const body = (await request.json()) as { text?: string };
  const text = body.text;
  if (typeof text !== "string") {
    return NextResponse.json({ ok: false, error: "ต้องส่ง text" }, { status: 400 });
  }

  const result = await parseRosterText(text);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: result.rows });
}
