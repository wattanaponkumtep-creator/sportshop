"use client";
import { getUploadUrl } from "@/app/(admin)/storage-actions";

// อัปโหลดไฟล์เข้า R2 (ขอ presigned URL จาก server แล้ว PUT ตรงเข้า R2)
// คืน publicUrl ไว้โชว์ preview · ที่เก็บใน DB ยังเป็น "path" เหมือนเดิม
export async function uploadToR2(
  path: string,
  file: File,
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  const res = await getUploadUrl(path);
  if (!res.ok) return { ok: false, error: res.error };
  try {
    const put = await fetch(res.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "content-type": file.type || "application/octet-stream" },
    });
    if (!put.ok) return { ok: false, error: `อัปโหลดไม่สำเร็จ (${put.status})` };
    return { ok: true, path, publicUrl: res.publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ" };
  }
}
