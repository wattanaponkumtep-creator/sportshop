"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const commentSchema = z.object({
  token: z.string().min(1),
  message: z.string().trim().min(2, "กรุณาพิมพ์ข้อความ").max(1000, "ข้อความยาวเกิน 1000 ตัวอักษร"),
  name: z.string().trim().optional().nullable(),
});

export type CommentInput = z.input<typeof commentSchema>;

export async function postCustomerComment(input: CommentInput) {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("post_customer_comment", {
    p_token: parsed.data.token,
    p_message: parsed.data.message,
    p_name: parsed.data.name ?? undefined,
  });

  if (error) return { ok: false as const, error: error.message };

  const result = data as { ok?: boolean; error?: string } | null;
  if (result && result.ok === false) return { ok: false as const, error: result.error ?? "ไม่สำเร็จ" };

  revalidatePath(`/track/${parsed.data.token}`);
  return { ok: true as const };
}
