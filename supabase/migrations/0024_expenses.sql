-- =========================================================================
-- Expenses — บันทึกเงินออกจริง (จ่ายโรงงาน, วัสดุ, ค่าเช่า, เงินเดือน ฯลฯ)
-- ใช้คู่กับ payments (เงินเข้า) เพื่อทำกระแสเงินสด (cash flow) จริง
-- =========================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'other'
    check (category in ('factory', 'material', 'shipping', 'rent', 'salary', 'marketing', 'utility', 'equipment', 'other')),
  amount numeric(12,2) not null check (amount >= 0),
  paid_at timestamptz not null default now(),
  note text,
  job_id uuid references public.jobs(id) on delete set null,  -- ผูกกับงาน (ถ้ามี)
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_paid_at_idx on public.expenses(paid_at desc);
create index if not exists expenses_category_idx on public.expenses(category);
create index if not exists expenses_job_idx on public.expenses(job_id);

alter table public.expenses enable row level security;
drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
