-- =========================================================================
-- Row Level Security: staff-only access for all tables
-- =========================================================================

alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.customer_channels enable row level security;
alter table public.factories enable row level security;
alter table public.jobs enable row level security;
alter table public.job_items enable row level security;
alter table public.job_files enable row level security;
alter table public.job_timeline enable row level security;
alter table public.factory_jobs enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.notifications enable row level security;

-- helper: is current user an active staff?
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and is_active = true
  );
$$;
grant execute on function public.is_staff() to authenticated;

-- users: see self only (avoid recursive RLS via subquery on same table)
create policy users_select on public.users for select using (auth.uid() = id);
create policy users_update_self on public.users for update using (auth.uid() = id);

-- generic: any active staff can do everything on business tables
create policy customers_all on public.customers for all using (public.is_staff()) with check (public.is_staff());
create policy customer_channels_all on public.customer_channels for all using (public.is_staff()) with check (public.is_staff());
create policy factories_all on public.factories for all using (public.is_staff()) with check (public.is_staff());
create policy jobs_all on public.jobs for all using (public.is_staff()) with check (public.is_staff());
create policy job_items_all on public.job_items for all using (public.is_staff()) with check (public.is_staff());
create policy job_files_all on public.job_files for all using (public.is_staff()) with check (public.is_staff());
create policy job_timeline_all on public.job_timeline for all using (public.is_staff()) with check (public.is_staff());
create policy factory_jobs_all on public.factory_jobs for all using (public.is_staff()) with check (public.is_staff());
create policy payments_all on public.payments for all using (public.is_staff()) with check (public.is_staff());
create policy shipments_all on public.shipments for all using (public.is_staff()) with check (public.is_staff());
create policy notifications_all on public.notifications for all using (public.is_staff()) with check (public.is_staff());

-- =========================================================================
-- Storage bucket
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-files', 'job-files', false, 104857600, null)
on conflict (id) do nothing;

create policy "staff read job-files" on storage.objects for select to authenticated
  using (bucket_id = 'job-files' and public.is_staff());
create policy "staff write job-files" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-files' and public.is_staff());
create policy "staff update job-files" on storage.objects for update to authenticated
  using (bucket_id = 'job-files' and public.is_staff());
create policy "staff delete job-files" on storage.objects for delete to authenticated
  using (bucket_id = 'job-files' and public.is_staff());
