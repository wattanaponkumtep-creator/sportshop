import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // --- TEMP DEBUG: surface what the callback actually receives ---
  const cookieStore = await cookies();
  const names = cookieStore.getAll().map((c) => c.name);
  const hasVerifier = names.some((n) => n.includes("code-verifier"));
  const dbg = (params: Record<string, string>) =>
    `${origin}/login?` + new URLSearchParams(params).toString();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      dbg({ error: "exfail", m: error.message.slice(0, 160), hv: String(hasVerifier) })
    );
  }

  return NextResponse.redirect(
    dbg({
      error: "nocode",
      hv: String(hasVerifier),
      params: searchParams.toString().slice(0, 160),
    })
  );
}
