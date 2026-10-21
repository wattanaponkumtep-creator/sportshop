import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { r2Exists, r2PutObject, isR2Configured } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "job-files";

// ลิสต์ไฟล์ทั้งหมดใน bucket แบบ recursive (metadata เบา)
async function listAll(
  supabase: ReturnType<typeof createServiceClient>,
  prefix = "",
): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (!data || data.length === 0) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        out.push(...(await listAll(supabase, full))); // โฟลเดอร์ → recurse
      } else {
        out.push(full);
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

/**
 * ย้ายไฟล์เดิมจาก Supabase Storage → R2
 * - เรียกซ้ำได้ (resume) — ข้ามไฟล์ที่ย้ายแล้ว
 * - หยุดเมื่อใกล้หมดเวลา แล้วบอกให้เรียกต่อ
 */
export async function GET(request: NextRequest) {
  // ต้องล็อกอิน (อยู่ในพื้นที่ admin)
  const authed = await createClient();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "ต้องเข้าสู่ระบบ" }, { status: 401 });
  if (!isR2Configured()) return NextResponse.json({ ok: false, error: "ยังไม่ได้ตั้งค่า R2 (env)" }, { status: 400 });

  const svc = createServiceClient();
  const started = Date.now();
  const budgetMs = 50_000;

  const all = await listAll(svc);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;
  const errors: string[] = [];

  for (const path of all) {
    if (Date.now() - started > budgetMs) break;
    processed++;
    try {
      if (await r2Exists(path)) {
        skipped++;
        continue;
      }
      const { data: blob, error } = await svc.storage.from(BUCKET).download(path);
      if (error || !blob) {
        failed++;
        if (errors.length < 10) errors.push(`${path}: download fail`);
        continue;
      }
      const buf = await blob.arrayBuffer();
      const ok = await r2PutObject(path, buf, blob.type || "application/octet-stream");
      if (ok) migrated++;
      else {
        failed++;
        if (errors.length < 10) errors.push(`${path}: upload fail`);
      }
    } catch (e) {
      failed++;
      if (errors.length < 10) errors.push(`${path}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  const remaining = all.length - skipped - migrated - failed;
  const done = remaining <= 0 && processed >= all.length;

  return NextResponse.json({
    ok: true,
    total: all.length,
    migrated,
    skipped,
    failed,
    remaining: Math.max(0, all.length - skipped - migrated),
    done,
    errors: errors.length ? errors : undefined,
  });
}
