"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const replySchema = z.object({
  factory_job_id: z.string().uuid(),
  job_id: z.string().uuid(),
  message: z.string().trim().min(1, "กรุณาใส่ข้อความ"),
});

export async function replyToFactory(input: z.input<typeof replySchema>) {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Read author name from users table if available
  let authorName: string | null = null;
  if (user?.id) {
    const { data: u } = await supabase.from("users").select("name").eq("id", user.id).maybeSingle();
    authorName = (u as { name: string | null } | null)?.name ?? null;
  }

  const { error } = await supabase.from("factory_messages").insert({
    factory_job_id: parsed.data.factory_job_id,
    job_id: parsed.data.job_id,
    author: "admin",
    author_name: authorName,
    kind: "text",
    message: parsed.data.message,
    read_by_admin: true,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return { ok: true as const };
}

export async function markFactoryMessagesRead(factoryJobId: string, jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("factory_messages")
    .update({ read_by_admin: true })
    .eq("factory_job_id", factoryJobId)
    .eq("author", "factory")
    .eq("read_by_admin", false);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}
