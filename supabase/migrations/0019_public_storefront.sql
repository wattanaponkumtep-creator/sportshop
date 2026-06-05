-- =========================================================================
-- Public Storefront (4 phases combined)
--   1. Catalog (fabric / collar / product types / sleeves / extras)
--   2. Portfolio (use designs with is_public flag)
--   3. Landing data (uses existing designs + catalog)
--   4. Quote request / inquiries
-- =========================================================================

-- 1) Catalog categories
create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Catalog items
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.catalog_categories(id) on delete cascade,
  name text not null,
  description text,
  thumbnail_path text,
  image_paths text[] not null default '{}',
  attributes jsonb not null default '{}',
  is_active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalog_items_category_idx on public.catalog_items(category_id, position);

drop trigger if exists catalog_items_updated_at on public.catalog_items;
create trigger catalog_items_updated_at before update on public.catalog_items
  for each row execute function public.set_updated_at();

-- 3) Inquiries (quote requests from public site)
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  line_id text,
  team_name text,
  product_type text,
  quantity int,
  budget numeric(10,2),
  message text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'converted', 'rejected')),
  converted_to_customer_id uuid references public.customers(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inquiries_status_idx on public.inquiries(status, created_at desc);

drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at before update on public.inquiries
  for each row execute function public.set_updated_at();

-- 4) Mark designs as publicly visible (for /portfolio)
-- Defensive: only run if designs table exists (in case 0011 not yet applied)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'designs')
  then
    alter table public.designs
      add column if not exists is_public boolean not null default false;
    create index if not exists designs_public_idx on public.designs(is_public) where is_public = true;
  end if;
end $$;

-- =========================================================================
-- RLS
-- =========================================================================

-- Catalog: public READ active, staff FULL
alter table public.catalog_categories enable row level security;
drop policy if exists catalog_categories_public_read on public.catalog_categories;
create policy catalog_categories_public_read on public.catalog_categories
  for select to anon, authenticated using (is_active = true);
drop policy if exists catalog_categories_staff on public.catalog_categories;
create policy catalog_categories_staff on public.catalog_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

alter table public.catalog_items enable row level security;
drop policy if exists catalog_items_public_read on public.catalog_items;
create policy catalog_items_public_read on public.catalog_items
  for select to anon, authenticated using (is_active = true);
drop policy if exists catalog_items_staff on public.catalog_items;
create policy catalog_items_staff on public.catalog_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Inquiries: public submits via RPC only; staff sees all
alter table public.inquiries enable row level security;
drop policy if exists inquiries_staff on public.inquiries;
create policy inquiries_staff on public.inquiries
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- =========================================================================
-- Seed common categories
-- =========================================================================
insert into public.catalog_categories (slug, name, description, icon, position) values
  ('fabric',  'เนื้อผ้า',       'ชนิดผ้าที่ใช้พิมพ์ — เลือกตามการใช้งานและงบประมาณ', '🧵', 1),
  ('collar',  'คอเสื้อ',         'แบบคอเสื้อให้เลือก — เปลี่ยน look ของชุดได้',         '👔', 2),
  ('product', 'ประเภทเสื้อ',     'เสื้อกีฬาแบ่งตามชนิดกีฬา + การออกแบบ',              '👕', 3),
  ('sleeve',  'แบบแขน',         'แขนสั้น / แขนยาว / ทรงต่าง ๆ',                       '💪', 4),
  ('extras',  'สินค้าเสริม',     'ถุงเท้า ปลอกแขน ผ้าพันคอ ฯลฯ',                       '🧦', 5)
  on conflict (slug) do nothing;

-- =========================================================================
-- Public RPCs
-- =========================================================================

-- Read full public catalog (categories + items) in one round-trip
create or replace function public.get_public_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'name', c.name,
      'description', c.description,
      'icon', c.icon,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'name', i.name,
          'description', i.description,
          'thumbnail_path', i.thumbnail_path,
          'image_paths', i.image_paths,
          'attributes', i.attributes
        ) order by i.position, i.created_at)
        from public.catalog_items i
        where i.category_id = c.id and i.is_active = true
      ), '[]'::jsonb)
    ) order by c.position, c.name)
    from public.catalog_categories c
    where c.is_active = true
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_public_catalog() from public;
grant execute on function public.get_public_catalog() to anon, authenticated;

-- Read one category by slug (for detail page)
create or replace function public.get_public_catalog_category(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'name', c.name,
    'description', c.description,
    'icon', c.icon,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'name', i.name,
        'description', i.description,
        'thumbnail_path', i.thumbnail_path,
        'image_paths', i.image_paths,
        'attributes', i.attributes
      ) order by i.position, i.created_at)
      from public.catalog_items i
      where i.category_id = c.id and i.is_active = true
    ), '[]'::jsonb)
  ) into result
  from public.catalog_categories c
  where c.slug = p_slug and c.is_active = true;
  return result;
end;
$$;

revoke all on function public.get_public_catalog_category(text) from public;
grant execute on function public.get_public_catalog_category(text) to anon, authenticated;

-- Read public portfolio (designs.is_public = true)
-- Defensive: only create if designs table exists
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'designs')
  then
    execute $func$
      create or replace function public.get_public_portfolio()
      returns jsonb
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        return coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', id,
            'code', code,
            'name', name,
            'description', description,
            'sport_type', sport_type,
            'colors', colors,
            'tags', tags,
            'thumbnail_path', thumbnail_path,
            'image_paths', image_paths,
            'created_at', created_at
          ) order by use_count desc, created_at desc)
          from public.designs
          where is_public = true
        ), '[]'::jsonb);
      end;
      $body$;
    $func$;
  else
    -- Stub: returns empty array until designs table is created
    execute $func$
      create or replace function public.get_public_portfolio()
      returns jsonb
      language sql
      security definer
      as $body$ select '[]'::jsonb $body$;
    $func$;
  end if;
end $$;

revoke all on function public.get_public_portfolio() from public;
grant execute on function public.get_public_portfolio() to anon, authenticated;

-- Submit inquiry (quote request)
create or replace function public.submit_inquiry(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_line_id text default null,
  p_team_name text default null,
  p_product_type text default null,
  p_quantity int default null,
  p_budget numeric default null,
  p_message text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'name_required';
  end if;
  if (p_phone is null or trim(p_phone) = '')
     and (p_email is null or trim(p_email) = '')
     and (p_line_id is null or trim(p_line_id) = '')
  then
    raise exception 'contact_required';
  end if;

  insert into public.inquiries
    (name, phone, email, line_id, team_name, product_type, quantity, budget, message)
  values
    (trim(p_name),
     nullif(trim(p_phone), ''),
     nullif(trim(p_email), ''),
     nullif(trim(p_line_id), ''),
     nullif(trim(p_team_name), ''),
     nullif(trim(p_product_type), ''),
     p_quantity,
     p_budget,
     nullif(trim(p_message), ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_inquiry(text, text, text, text, text, text, int, numeric, text) from public;
grant execute on function public.submit_inquiry(text, text, text, text, text, text, int, numeric, text) to anon, authenticated;
