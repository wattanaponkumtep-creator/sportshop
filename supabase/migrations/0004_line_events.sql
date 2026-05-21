-- =========================================================================
-- Phase 10: LINE OA webhook event log
-- =========================================================================

create table public.line_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  line_user_id text,
  message_text text,
  raw_payload jsonb not null,
  customer_id uuid references public.customers(id) on delete set null,
  linked_at timestamptz,
  created_at timestamptz not null default now()
);
create index line_events_user_idx on public.line_webhook_events(line_user_id);
create index line_events_created_idx on public.line_webhook_events(created_at desc);
create index line_events_unlinked_idx on public.line_webhook_events(linked_at) where linked_at is null;

alter table public.line_webhook_events enable row level security;
create policy line_events_all on public.line_webhook_events
  for all using (public.is_staff()) with check (public.is_staff());
