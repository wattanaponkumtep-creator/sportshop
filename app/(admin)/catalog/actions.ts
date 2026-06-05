"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1, "กรุณาใส่ชื่อ"),
  description: z.string().trim().optional().nullable(),
  thumbnail_path: z.string().trim().optional().nullable(),
  image_paths: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
  position: z.coerce.number().int().default(0),
});

export type CatalogItemInput = z.input<typeof itemSchema>;

export async function createCatalogItem(input: CatalogItemInput) {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      thumbnail_path: parsed.data.thumbnail_path || null,
      image_paths: parsed.data.image_paths,
      attributes: parsed.data.attributes,
      is_active: parsed.data.is_active,
      position: parsed.data.position,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message ?? "บันทึกไม่สำเร็จ" };

  revalidatePath("/catalog");
  return { ok: true as const, id: data.id as string };
}

export async function updateCatalogItem(id: string, input: CatalogItemInput) {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("catalog_items")
    .update({
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      thumbnail_path: parsed.data.thumbnail_path || null,
      image_paths: parsed.data.image_paths,
      attributes: parsed.data.attributes,
      is_active: parsed.data.is_active,
      position: parsed.data.position,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/catalog");
  return { ok: true as const };
}

export async function deleteCatalogItem(id: string) {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("catalog_items")
    .select("image_paths, thumbnail_path")
    .eq("id", id)
    .maybeSingle();
  const it = item as { image_paths: string[]; thumbnail_path: string | null } | null;
  const toRemove = new Set<string>();
  if (it?.thumbnail_path) toRemove.add(it.thumbnail_path);
  it?.image_paths.forEach((p) => toRemove.add(p));
  if (toRemove.size > 0) {
    await supabase.storage.from("job-files").remove(Array.from(toRemove));
  }
  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/catalog");
  return { ok: true as const };
}

export async function toggleItemActive(id: string, is_active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_items").update({ is_active }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/catalog");
  return { ok: true as const };
}

export async function createCatalogFileUrls(paths: string[]) {
  if (paths.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from("job-files").createSignedUrls(paths, 3600);
  const map = new Map<string, string>();
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  }
  return paths.map((path) => ({ path, url: map.get(path) ?? null }));
}
