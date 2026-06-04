"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FactoryJobStatus, JobStatus } from "@/lib/types/database";
import { sendStatusNotificationToCustomer } from "@/lib/jobs/notifications";

const JOB_STATUS_VALUES = [
  "received", "designing", "awaiting_approval", "sent_to_factory",
  "producing", "qc", "ready_to_ship", "shipped", "completed", "cancelled",
] as const;
const PRIORITY_VALUES = ["normal", "urgent", "rush"] as const;

const newJobSchema = z.object({
  customer_id: z.string().uuid("กรุณาเลือกลูกค้า"),
  product_type: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().min(0).default(0),
  sale_price: z.coerce.number().min(0).default(0),
  cost: z.coerce.number().min(0).default(0),
  shipping_cost: z.coerce.number().min(0).default(0),
  other_cost: z.coerce.number().min(0).default(0),
  priority: z.enum(PRIORITY_VALUES).default("normal"),
  due_date: z.string().trim().optional().nullable(),
  factory_id: z.string().uuid().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

export type NewJobInput = z.input<typeof newJobSchema>;

export async function createJob(input: NewJobInput) {
  const parsed = newJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      customer_id: parsed.data.customer_id,
      product_type: parsed.data.product_type || null,
      quantity: parsed.data.quantity,
      sale_price: parsed.data.sale_price,
      cost: parsed.data.cost,
      shipping_cost: parsed.data.shipping_cost,
      other_cost: parsed.data.other_cost,
      priority: parsed.data.priority,
      due_date: parsed.data.due_date || null,
      factory_id: parsed.data.factory_id || null,
      note: parsed.data.note || null,
      created_by: user?.id ?? null,
    })
    .select("id, job_code")
    .single();

  if (error || !job) {
    return { ok: false as const, error: error?.message ?? "บันทึกไม่สำเร็จ" };
  }

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect(`/jobs/${job.id}`);
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) return { ok: false as const, error: error.message };

  // Auto-send LINE notification on meaningful status changes (best-effort, ignore failures)
  const notifyStatuses: JobStatus[] = ["sent_to_factory", "ready_to_ship", "shipped", "completed"];
  if (notifyStatuses.includes(status)) {
    try {
      await sendStatusNotificationToCustomer(jobId, status);
    } catch {
      // Don't block status update if notification fails
    }
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const editJobSchema = z.object({
  product_type: z.string().trim().nullable().optional(),
  job_label: z.string().trim().nullable().optional(),
  quantity: z.coerce.number().int().min(0),
  sale_price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  shipping_cost: z.coerce.number().min(0),
  other_cost: z.coerce.number().min(0),
  priority: z.enum(PRIORITY_VALUES),
  due_date: z.string().trim().nullable().optional(),
  factory_id: z.string().uuid().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});

export async function updateJob(jobId: string, input: z.input<typeof editJobSchema>) {
  const parsed = editJobSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({
    product_type: parsed.data.product_type || null,
    job_label: parsed.data.job_label || null,
    quantity: parsed.data.quantity,
    sale_price: parsed.data.sale_price,
    cost: parsed.data.cost,
    shipping_cost: parsed.data.shipping_cost,
    other_cost: parsed.data.other_cost,
    priority: parsed.data.priority,
    due_date: parsed.data.due_date || null,
    factory_id: parsed.data.factory_id || null,
    note: parsed.data.note || null,
  }).eq("id", jobId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const itemSchema = z.object({
  name: z.string().trim().optional().nullable(),
  number: z.string().trim().optional().nullable(),
  size: z.string().trim().optional().nullable(),
  sponsor: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
  item_type: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
});

export async function saveJobItems(jobId: string, items: z.input<typeof itemSchema>[]) {
  const parsed = z.array(itemSchema).safeParse(items);
  if (!parsed.success) return { ok: false as const, error: "ข้อมูลรายการไม่ถูกต้อง" };

  const supabase = await createClient();
  await supabase.from("job_items").delete().eq("job_id", jobId);
  if (parsed.data.length > 0) {
    const { error } = await supabase.from("job_items").insert(
      parsed.data.map((it, idx) => ({
        job_id: jobId,
        name: it.name || null,
        number: it.number || null,
        size: it.size || null,
        sponsor: it.sponsor || null,
        note: it.note || null,
        item_type: it.item_type || null,
        quantity: it.quantity,
        position: idx,
      }))
    );
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

// บันทึกจำนวนเสื้อที่ตรวจรับจากโรงงาน
// counts รูปแบบ: { "เป็นชุด.M": 5, "เป็นชุด.L": 10, "เฉพาะเสื้อ.M": 3 }
// (key = "type.size", value = count)
export async function updateReceivingCounts(
  jobId: string,
  counts: Record<string, number>,
  note?: string | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Sanitize: เก็บเฉพาะ entry ที่ count > 0 และ key ถูกต้อง
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) continue;
    if (n === 0) continue;
    cleaned[k] = Math.floor(n);
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      received_counts: cleaned,
      received_check_at: new Date().toISOString(),
      received_check_note: note?.trim() || null,
    } as never)
    .eq("id", jobId);

  if (error) return { ok: false as const, error: error.message };

  // เขียน timeline
  const total = Object.values(cleaned).reduce((s, n) => s + n, 0);
  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "received_check",
    description: `ตรวจรับเสื้อ — นับได้ ${total} ตัว${note ? ` (${note})` : ""}`,
    actor_id: user?.id ?? null,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

export async function addTimelineEvent(jobId: string, eventType: string, description: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: eventType,
    description,
    actor_id: user?.id ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

const factoryJobSchema = z.object({
  factory_id: z.string().uuid(),
  status: z.enum(["sent", "producing", "sewing", "qc", "returned"] as const),
  cost: z.coerce.number().min(0).optional(),
  note: z.string().trim().optional().nullable(),
});

export async function upsertFactoryJob(jobId: string, input: z.input<typeof factoryJobSchema>) {
  const parsed = factoryJobSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("factory_jobs")
    .select("id")
    .eq("job_id", jobId)
    .eq("factory_id", parsed.data.factory_id)
    .maybeSingle();

  const payload = {
    job_id: jobId,
    factory_id: parsed.data.factory_id,
    status: parsed.data.status,
    cost: parsed.data.cost ?? null,
    note: parsed.data.note || null,
    sent_at: parsed.data.status === "sent" ? new Date().toISOString() : undefined,
    returned_at: parsed.data.status === "returned" ? new Date().toISOString() : undefined,
  };

  const { error } = existing
    ? await supabase.from("factory_jobs").update(payload).eq("id", existing.id)
    : await supabase.from("factory_jobs").insert(payload);

  if (error) return { ok: false as const, error: error.message };

  await supabase.from("job_timeline").insert({
    job_id: jobId,
    event_type: "factory_status",
    description: `อัปเดตสถานะโรงงาน → ${parsed.data.status}`,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

const shipmentSchema = z.object({
  carrier: z.string().trim().optional().nullable(),
  tracking_no: z.string().trim().optional().nullable(),
  status: z.enum(["preparing", "shipped", "in_transit", "delivered", "returned"] as const),
  note: z.string().trim().optional().nullable(),
});

export async function saveShipment(jobId: string, input: z.input<typeof shipmentSchema>) {
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shipments")
    .select("id")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    job_id: jobId,
    carrier: parsed.data.carrier || null,
    tracking_no: parsed.data.tracking_no || null,
    status: parsed.data.status,
    note: parsed.data.note || null,
    shipped_at: parsed.data.status === "shipped" || parsed.data.status === "in_transit" ? new Date().toISOString() : undefined,
    delivered_at: parsed.data.status === "delivered" ? new Date().toISOString() : undefined,
  };

  const { error } = existing
    ? await supabase.from("shipments").update(payload).eq("id", existing.id)
    : await supabase.from("shipments").insert(payload);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();

  // 1. Collect all storage paths to delete
  const [{ data: jobFiles }, { data: mockups }, { data: payments }] = await Promise.all([
    supabase.from("job_files").select("storage_path").eq("job_id", jobId),
    supabase.from("mockups").select("storage_paths").eq("job_id", jobId),
    supabase.from("payments").select("slip_path").eq("job_id", jobId).not("slip_path", "is", null),
  ]);

  const pathsToDelete: string[] = [];
  for (const f of (jobFiles ?? []) as { storage_path: string }[]) {
    if (f.storage_path) pathsToDelete.push(f.storage_path);
  }
  for (const m of (mockups ?? []) as { storage_paths: string[] }[]) {
    if (Array.isArray(m.storage_paths)) pathsToDelete.push(...m.storage_paths);
  }
  for (const p of (payments ?? []) as { slip_path: string | null }[]) {
    if (p.slip_path) pathsToDelete.push(p.slip_path);
  }

  // 2. Delete files from storage (best-effort; ignore errors)
  if (pathsToDelete.length > 0) {
    await supabase.storage.from("job-files").remove(pathsToDelete);
  }

  // 3. Delete the job (cascade will handle job_items, job_files, job_timeline,
  //    factory_jobs, payments, shipments, mockups, notifications)
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true as const };
}

export async function deleteJobFile(fileId: string, jobId: string) {
  const supabase = await createClient();
  const { data: file } = await supabase.from("job_files").select("storage_path").eq("id", fileId).maybeSingle();
  if (file?.storage_path) {
    await supabase.storage.from("job-files").remove([file.storage_path]);
  }
  const { error } = await supabase.from("job_files").delete().eq("id", fileId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}

export async function createSignedFileUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("job-files").createSignedUrl(storagePath, 3600);
  if (error || !data) return { ok: false as const, error: error?.message ?? "ไม่สามารถสร้างลิงก์" };
  return { ok: true as const, url: data.signedUrl };
}
