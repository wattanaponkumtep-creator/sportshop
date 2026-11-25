-- =========================================================================
-- 0033: ขั้นตอน "ตัวอย่าง" ก่อนผลิตเต็มล็อต (Sample Gate)
-- ทุกงานต้องผลิตตัวอย่าง 1 ตัว/ชุดก่อน → ร้านอนุมัติ → ค่อยปลดล็อกผลิตเต็มล็อต
-- =========================================================================

alter table public.jobs
  add column if not exists sample_status text not null default 'pending',
  add column if not exists sample_approved_at timestamptz,
  add column if not exists sample_note text;

-- grandfather งานเดิมทั้งหมด (ก่อนมีฟีเจอร์นี้) ให้ผ่านอัตโนมัติ
-- เพื่อไม่บล็อกงานที่กำลังดำเนินอยู่
update public.jobs
  set sample_status = 'approved',
      sample_approved_at = coalesce(sample_approved_at, updated_at)
  where sample_status = 'pending';
