-- =========================================================================
-- 0034: ยืนยันออเดอร์โดยลูกค้า + ข้อตกลงความรับผิดชอบ (Order Confirmation)
-- ลูกค้ายืนยัน จำนวน/รายชื่อ/ไซซ์/สเปค ก่อนผลิต → เก็บเป็นหลักฐานกันเคลม
-- =========================================================================

alter table public.jobs add column if not exists order_confirm_token text;
alter table public.jobs add column if not exists order_confirmed_at timestamptz;
alter table public.jobs add column if not exists order_confirmed_by text;

-- backfill token ให้งานเดิม (unique ต่อแถว)
update public.jobs
  set order_confirm_token = encode(gen_random_bytes(16), 'hex')
  where order_confirm_token is null;

-- default สำหรับงานใหม่
alter table public.jobs alter column order_confirm_token set default encode(gen_random_bytes(16), 'hex');

create unique index if not exists jobs_order_confirm_token_idx on public.jobs(order_confirm_token);
