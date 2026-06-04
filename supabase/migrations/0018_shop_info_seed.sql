-- =========================================================================
-- Ensure shop_info row id=1 exists (safety net if seed didn't run)
-- =========================================================================

insert into public.shop_info (id, shop_name)
  values (1, 'SportShop')
  on conflict (id) do nothing;
