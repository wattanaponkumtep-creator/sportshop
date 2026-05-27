-- =========================================================================
-- Phase 15: Add item_type to job_items
-- =========================================================================
alter table public.job_items
  add column if not exists item_type text;
-- item_type examples: "เป็นชุด", "เฉพาะเสื้อ", "เฉพาะกางเกง", "ถุงเท้า", "ปลอกแขน", "อื่น ๆ"

create index if not exists job_items_type_idx on public.job_items(job_id, item_type);
