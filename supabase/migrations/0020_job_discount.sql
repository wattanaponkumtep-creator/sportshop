-- =========================================================================
-- เพิ่ม discount (ส่วนลด) ใน JOB
-- net = sale_price - discount
-- =========================================================================

alter table public.jobs
  add column if not exists discount numeric(10,2) not null default 0
    check (discount >= 0);

comment on column public.jobs.discount is 'Discount amount in baht (subtract from sale_price)';
