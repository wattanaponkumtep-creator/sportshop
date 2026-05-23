-- =========================================================================
-- Phase 12: Calendar feed + Admin daily digest
-- =========================================================================

-- Add calendar token (for .ics subscription) + personal LINE ID (for admin digest)
alter table public.users
  add column if not exists calendar_token text not null default encode(gen_random_bytes(16), 'hex'),
  add column if not exists line_user_id_personal text;

create unique index if not exists users_calendar_token_idx on public.users(calendar_token);
