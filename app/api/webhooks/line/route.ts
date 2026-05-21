import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyLineSignature, getLineProfile } from "@/lib/line/client";

type LineEvent = {
  type: string;
  source?: { userId?: string; type?: string };
  message?: { type: string; text?: string };
  timestamp?: number;
};

type WebhookBody = {
  destination?: string;
  events?: LineEvent[];
};

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(raw, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const supabase = createServiceClient();

  for (const event of body.events ?? []) {
    const lineUserId = event.source?.userId ?? null;
    const messageText = event.message?.type === "text" ? event.message.text ?? null : null;

    let customerId: string | null = null;
    if (lineUserId) {
      const { data: channel } = await supabase
        .from("customer_channels")
        .select("customer_id")
        .eq("channel_type", "line_oa")
        .eq("external_id", lineUserId)
        .maybeSingle();
      customerId = (channel as { customer_id: string } | null)?.customer_id ?? null;
    }

    await supabase.from("line_webhook_events").insert({
      event_type: event.type,
      line_user_id: lineUserId,
      message_text: messageText,
      raw_payload: event as unknown as Record<string, unknown>,
      customer_id: customerId,
      linked_at: customerId ? new Date().toISOString() : null,
    });

    if (event.type === "follow" && lineUserId) {
      const profile = await getLineProfile(lineUserId);
      if (profile.ok && profile.displayName) {
        await supabase.from("line_webhook_events").insert({
          event_type: "profile_fetched",
          line_user_id: lineUserId,
          message_text: `Display name: ${profile.displayName}`,
          raw_payload: { displayName: profile.displayName, pictureUrl: profile.pictureUrl },
          customer_id: customerId,
          linked_at: customerId ? new Date().toISOString() : null,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "LINE webhook endpoint — use POST" });
}
