"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** สั่งซ้ำ: สร้างงานใหม่จากงานเดิม (คัดลอกแบบ + รายชื่อ + สเปค) */
export async function reorderJob(sourceId: string) {
  const supabase = await createClient();

  const { data: src, error } = await supabase.from("jobs").select("*").eq("id", sourceId).single();
  if (error || !src) return { ok: false as const, error: "ไม่พบงานต้นฉบับ" };

  const { data: newJob, error: insErr } = await supabase
    .from("jobs")
    .insert({
      customer_id: src.customer_id,
      factory_id: src.factory_id,
      product_type: src.product_type,
      job_label: src.job_label,
      production_options: src.production_options ?? [],
      sale_price: src.sale_price,
      cost: src.cost,
      shipping_cost: src.shipping_cost,
      other_cost: src.other_cost,
      customer_shipping_fee: src.customer_shipping_fee,
      delivery_method: src.delivery_method,
      delivery_address: src.delivery_address,
      design_id: src.design_id,
      note: `สั่งซ้ำจาก ${src.job_code}`,
      status: "received",
      priority: "normal",
    })
    .select("id")
    .single();
  if (insErr || !newJob) return { ok: false as const, error: insErr?.message ?? "สร้างงานไม่สำเร็จ" };

  // คัดลอกรายชื่อ (roster)
  const { data: items } = await supabase
    .from("job_items")
    .select("name, number, size, sponsor, note, position, item_type, quantity")
    .eq("job_id", sourceId)
    .order("position");
  if (items && items.length) {
    await supabase.from("job_items").insert(items.map((it) => ({ ...it, job_id: newJob.id })));
  }

  // คัดลอกรายการสินค้า (line items)
  const { data: lineItems } = await supabase
    .from("job_line_items")
    .select("product_type, collar_type, description, quantity, unit_sale_price, unit_cost, factory_id, position")
    .eq("job_id", sourceId)
    .order("position");
  if (lineItems && lineItems.length) {
    await supabase.from("job_line_items").insert(lineItems.map((li) => ({ ...li, job_id: newJob.id })));
  }

  // คัดลอกแบบล่าสุด (เป็น draft — รอส่งอนุมัติรอบใหม่ถ้าต้องการ)
  const { data: mks } = await supabase
    .from("mockups")
    .select("title, description, storage_paths")
    .eq("job_id", sourceId)
    .order("version", { ascending: false })
    .limit(1);
  if (mks && mks.length) {
    const m = mks[0];
    await supabase.from("mockups").insert({
      job_id: newJob.id,
      title: m.title,
      description: m.description,
      storage_paths: m.storage_paths,
      version: 1,
      status: "draft",
    });
  }

  await supabase.from("job_timeline").insert({
    job_id: newJob.id,
    event_type: "reorder_created",
    description: `🔁 สร้างจากการสั่งซ้ำ ${src.job_code}`,
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true as const, newJobId: newJob.id };
}
