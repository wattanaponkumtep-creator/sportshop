"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createMockupSchema = z.object({
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  storage_paths: z.array(z.string()).min(1, "ต้องอัปโหลดอย่างน้อย 1 ไฟล์"),
});

export async function createMockup(jobId: string, input: z.input<typeof createMockupSchema>) {
  const parsed = createMockupSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("mockups")
    .select("version")
    .eq("job_id", jobId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((existing?.version as number | undefined) ?? 0) + 1;

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("mockups")
    .insert({
      job_id: jobId,
      version: nextVersion,
      title: parsed.data.title || null,
      description: parsed.data.description || null,
      storage_paths: parsed.data.storage_paths,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message ?? "บันทึกไม่สำเร็จ" };

  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "mockup_created",
    description: `สร้าง Mockup v${nextVersion}`,
    actor_id: user?.id ?? null,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const, mockupId: (data as { id: string }).id, version: nextVersion };
}

export async function sendMockupForApproval(mockupId: string, jobId: string) {
  const supabase = await createClient();

  const { data: mockup } = await supabase
    .from("mockups")
    .select("version, status")
    .eq("id", mockupId)
    .maybeSingle();

  if (!mockup) return { ok: false as const, error: "ไม่พบ mockup" };
  const m = mockup as { version: number; status: string };

  if (m.status !== "draft" && m.status !== "rejected") {
    return { ok: false as const, error: `Mockup สถานะ "${m.status}" ส่งอนุมัติไม่ได้` };
  }

  const { error } = await supabase
    .from("mockups")
    .update({ status: "awaiting_approval", decision_note: null, decided_at: null, decided_by_name: null })
    .eq("id", mockupId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("jobs").update({ status: "awaiting_approval" }).eq("id", jobId);

  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "mockup_sent",
    description: `ส่ง Mockup v${m.version} ให้ลูกค้าอนุมัติ`,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

export async function deleteMockup(mockupId: string, jobId: string) {
  const supabase = await createClient();

  const { data: mockup } = await supabase
    .from("mockups")
    .select("storage_paths, version")
    .eq("id", mockupId)
    .maybeSingle();

  const m = mockup as { storage_paths: string[]; version: number } | null;

  if (m?.storage_paths && m.storage_paths.length > 0) {
    await supabase.storage.from("job-files").remove(m.storage_paths);
  }

  const { error } = await supabase.from("mockups").delete().eq("id", mockupId);
  if (error) return { ok: false as const, error: error.message };

  if (m) {
    await supabase.from("job_timeline").insert({
      job_id: jobId,
      event_type: "mockup_deleted",
      description: `ลบ Mockup v${m.version}`,
    });
  }

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

export async function createMockupFileUrls(paths: string[]) {
  const supabase = await createClient();
  const results = await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage.from("job-files").createSignedUrl(path, 3600);
      return { path, url: data?.signedUrl ?? null };
    })
  );
  return results;
}
