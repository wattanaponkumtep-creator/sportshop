import "server-only";
import crypto from "node:crypto";

const LINE_API_BASE = "https://api.line.me/v2/bot";

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "sticker"; packageId: string; stickerId: string };

function getEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export function isLineConfigured(): boolean {
  return !!(getEnv("LINE_CHANNEL_ACCESS_TOKEN") && getEnv("LINE_CHANNEL_SECRET"));
}

/**
 * Send a push message to a single LINE user via Messaging API.
 * Returns { ok, error?, status? }.
 */
export async function pushLineMessage(userId: string, messages: LineMessage[]): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  const token = getEnv("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) {
    return { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN not configured" };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: userId, messages }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, error: text || `LINE API error ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Verify LINE webhook signature.
 * https://developers.line.biz/en/reference/messaging-api/#signature-validation
 */
export function verifyLineSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = getEnv("LINE_CHANNEL_SECRET");
  if (!secret) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expected = hmac.digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Get LINE user profile (display name, picture).
 */
export async function getLineProfile(userId: string): Promise<{
  ok: boolean;
  displayName?: string;
  pictureUrl?: string;
  error?: string;
}> {
  const token = getEnv("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "Not configured" };

  try {
    const res = await fetch(`${LINE_API_BASE}/profile/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { displayName?: string; pictureUrl?: string };
    return { ok: true, displayName: data.displayName, pictureUrl: data.pictureUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
