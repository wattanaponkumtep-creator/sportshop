import "server-only";
import { AwsClient } from "aws4fetch";

// ---- R2 config (จาก env ที่ตั้งใน Vercel) ----
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const BUCKET = process.env.R2_BUCKET ?? "";
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

export function isR2Configured() {
  return !!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_URL);
}

const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

function client() {
  return new AwsClient({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: "auto",
    service: "s3",
  });
}

// URL สาธารณะของไฟล์ (คงที่ → เบราว์เซอร์ cache ได้ → egress แทบ 0)
export function r2PublicUrl(path: string): string {
  return `${PUBLIC_URL}/${path.replace(/^\/+/, "")}`;
}

// presigned PUT URL ให้ client อัปโหลดไฟล์เข้า R2 โดยตรง (รองรับไฟล์ใหญ่)
export async function r2PresignPut(path: string, expiresSeconds = 600): Promise<string> {
  const url = new URL(`${ENDPOINT}/${BUCKET}/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await client().sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

// ลบไฟล์หลายอัน
export async function r2Delete(paths: string[]): Promise<void> {
  const aws = client();
  await Promise.all(
    paths.map(async (p) => {
      const url = `${ENDPOINT}/${BUCKET}/${p.replace(/^\/+/, "")}`;
      try {
        await aws.fetch(url, { method: "DELETE" });
      } catch {
        // เงียบไว้ — ลบไม่สำเร็จไม่ควรทำให้ flow พัง
      }
    }),
  );
}

// เช็คว่าไฟล์มีใน R2 แล้วหรือยัง (สำหรับ migration แบบ resume ได้)
export async function r2Exists(path: string): Promise<boolean> {
  const url = `${ENDPOINT}/${BUCKET}/${path.replace(/^\/+/, "")}`;
  try {
    const res = await client().fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// อัปโหลดจากฝั่ง server (เช่น ตอนย้ายไฟล์เก่า) — body เป็น ArrayBuffer/Blob
export async function r2PutObject(path: string, body: ArrayBuffer | Uint8Array | Blob, contentType?: string): Promise<boolean> {
  const url = `${ENDPOINT}/${BUCKET}/${path.replace(/^\/+/, "")}`;
  const res = await client().fetch(url, {
    method: "PUT",
    body: body as BodyInit,
    headers: contentType ? { "content-type": contentType } : undefined,
  });
  return res.ok;
}

export { BUCKET as R2_BUCKET };
