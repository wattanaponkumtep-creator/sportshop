"use server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { FactoryMessageKind, FactoryProductionStage } from "@/lib/types/database";

const KIND_VALUES = ["text", "progress", "issue", "complete", "question"] as const;
const STAGE_VALUES = ["layout", "print", "sew", "ship"] as const;

function isKind(x: string): x is FactoryMessageKind {
  return (KIND_VALUES as readonly string[]).includes(x);
}
function isStage(x: string): x is FactoryProductionStage {
  return (STAGE_VALUES as readonly string[]).includes(x);
}

/**
 * Public action: factory posts a message via portal token.
 * No auth required — token is the credential.
 */
export async function postFactoryMessage(
  token: string,
  kind: string,
  message: string,
  authorName?: string,
  stage?: string | null,
  progressValue?: number | null,
) {
  if (!isKind(kind)) return { ok: false as const, error: "ประเภทข้อความไม่ถูกต้อง" };
  if (stage && !isStage(stage)) return { ok: false as const, error: "ขั้นตอนไม่ถูกต้อง" };

  const trimmed = message.trim();
  if (kind !== "complete" && !trimmed) {
    return { ok: false as const, error: "กรุณาใส่ข้อความ" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("factory_post_message", {
    p_token: token,
    p_kind: kind,
    p_message: trimmed,
    p_stage: stage ?? null,
    p_progress_value: progressValue ?? null,
    p_author_name: authorName?.trim() || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/factory/${token}`);
  return { ok: true as const };
}

/**
 * Public action: factory updates a production stage % via portal token.
 */
export async function updateFactoryStage(
  token: string,
  stage: string,
  value: number,
  authorName?: string,
) {
  if (!isStage(stage)) return { ok: false as const, error: "ขั้นตอนไม่ถูกต้อง" };
  const v = Math.max(0, Math.min(100, Math.floor(value)));

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("factory_update_stage", {
    p_token: token,
    p_stage: stage,
    p_value: v,
    p_author_name: authorName?.trim() || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/factory/${token}`);
  return { ok: true as const };
}
