"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const decisionSchema = z.object({
  token: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().optional().nullable(),
  name: z.string().trim().optional().nullable(),
});

export type DecisionInput = z.input<typeof decisionSchema>;

export async function submitMockupDecision(input: DecisionInput) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  if (parsed.data.decision === "reject" && !parsed.data.note?.trim()) {
    return { ok: false as const, error: "กรุณาใส่หมายเหตุการขอแก้ไข" };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("submit_mockup_decision", {
    p_token: parsed.data.token,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note ?? undefined,
    p_name: parsed.data.name ?? undefined,
  });

  if (error) return { ok: false as const, error: error.message };

  const result = data as { ok?: boolean; error?: string } | null;
  if (result && result.ok === false) return { ok: false as const, error: result.error ?? "ไม่สำเร็จ" };

  revalidatePath(`/approve/${parsed.data.token}`);
  return { ok: true as const };
}
