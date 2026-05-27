import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRosterWithAI } from "@/lib/parser/ai-roster";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Verify user is logged in + active staff
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

  // Read file from form data
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "ไม่พบไฟล์" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/pdf";

  // Allowed types
  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(mimeType.toLowerCase())) {
    return NextResponse.json(
      { ok: false, error: `รองรับเฉพาะ PDF, PNG, JPG (ได้ ${mimeType})` },
      { status: 400 }
    );
  }

  const result = await parseRosterWithAI(buffer, mimeType);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: result.rows });
}
