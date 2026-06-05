"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const designSchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อดีไซน์"),
  description: z.string().trim().optional().nullable(),
  sport_type: z.string().trim().optional().nullable(),
  colors: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  thumbnail_path: z.string().trim().optional().nullable(),
  image_paths: z.array(z.string()).default([]),
  suggested_price: z.coerce.number().min(0).optional().nullable(),
  suggested_cost: z.coerce.number().min(0).optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

export type DesignInput = z.input<typeof designSchema>;
type DesignSchemaOutput = z.output<typeof designSchema>;

// Shared mapping: parsed schema → DB row columns
function toDbRow(parsed: DesignSchemaOutput) {
  return {
    name: parsed.name,
    description: parsed.description || null,
    sport_type: parsed.sport_type || null,
    colors: parsed.colors,
    tags: parsed.tags,
    thumbnail_path: parsed.thumbnail_path || null,
    image_paths: parsed.image_paths,
    suggested_price: parsed.suggested_price ?? null,
    suggested_cost: parsed.suggested_cost ?? null,
    note: parsed.note || null,
  };
}

export async function createDesign(input: DesignInput) {
  const parsed = designSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("designs")
    .insert({ ...toDbRow(parsed.data), created_by: user?.id ?? null })
    .select("id, code")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message ?? "บันทึกไม่สำเร็จ" };

  revalidatePath("/designs");
  return { ok: true as const, id: data.id as string, code: data.code as string };
}

export async function updateDesign(id: string, input: DesignInput) {
  const parsed = designSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("designs")
    .update(toDbRow(parsed.data))
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/designs");
  revalidatePath(`/designs/${id}`);
  return { ok: true as const };
}

export async function toggleFavoriteDesign(id: string, value: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("designs")
    .update({ is_favorite: value })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/designs");
  revalidatePath(`/designs/${id}`);
  return { ok: true as const };
}

export async function togglePublicDesign(id: string, value: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("designs")
    .update({ is_public: value })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/designs");
  revalidatePath(`/designs/${id}`);
  revalidatePath("/portfolio");
  return { ok: true as const };
}

export async function deleteDesign(id: string) {
  const supabase = await createClient();

  // Fetch image paths to clean up storage
  const { data: design } = await supabase
    .from("designs")
    .select("image_paths, thumbnail_path")
    .eq("id", id)
    .maybeSingle();

  const d = design as { image_paths: string[]; thumbnail_path: string | null } | null;
  const toRemove = new Set<string>();
  if (d?.thumbnail_path) toRemove.add(d.thumbnail_path);
  if (d?.image_paths) d.image_paths.forEach((p) => toRemove.add(p));

  if (toRemove.size > 0) {
    await supabase.storage.from("job-files").remove(Array.from(toRemove));
  }

  const { error } = await supabase.from("designs").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/designs");
  return { ok: true as const };
}

/**
 * Batch sign URLs for a list of storage paths in one round-trip.
 * Returns paths in the same order as input; entries whose URL failed are dropped.
 */
export async function createDesignFileUrls(paths: string[]) {
  if (paths.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from("job-files").createSignedUrls(paths, 3600);
  const map = new Map<string, string>();
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  }
  return paths.map((path) => ({ path, url: map.get(path) ?? null }));
}
