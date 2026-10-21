"use server";
import { createClient } from "@/lib/supabase/server";
import { r2PresignPut, r2PublicUrl, isR2Configured } from "@/lib/storage/r2";

// client เรียกเพื่อขอ presigned URL อัปโหลดเข้า R2 + URL สาธารณะไว้โชว์
export async function getUploadUrl(path: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "ต้องเข้าสู่ระบบ" };
  if (!isR2Configured()) return { ok: false as const, error: "ยังไม่ได้ตั้งค่า R2 (env)" };

  const clean = path.replace(/^\/+/, "");
  try {
    const uploadUrl = await r2PresignPut(clean);
    return { ok: true as const, uploadUrl, publicUrl: r2PublicUrl(clean) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "สร้าง URL ไม่สำเร็จ" };
  }
}
