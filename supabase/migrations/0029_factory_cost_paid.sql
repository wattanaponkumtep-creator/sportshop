-- =========================================================================
-- 0029: ติดตามการจ่ายค่าผลิตให้โรงงาน
-- งานที่สถานะ "ส่งโรงงานแล้ว" ขึ้นไป = ต้องเตรียมเงินจ่ายค่าผลิต (job.cost)
-- factory_cost_paid_at != null  → จ่ายแล้ว (ออกจากลิสต์ที่ต้องเตรียมเงิน)
-- =========================================================================

alter table public.jobs
  add column if not exists factory_cost_paid_at timestamptz;

create index if not exists jobs_factory_cost_paid_idx
  on public.jobs(factory_cost_paid_at);
