-- =========================================================================
-- 0032: ค่าส่งที่คิดกับลูกค้า (คิดเมื่อสั่งน้อยกว่าเกณฑ์)
-- นโยบาย: สั่งน้อยกว่า free_ship_min_qty ตัว → บวกค่าส่ง customer_ship_fee
-- =========================================================================

-- ค่าส่งที่บวกให้ลูกค้าในงานนี้ (รวมอยู่ใน sale_price แล้ว — เก็บไว้โชว์แยกให้ลูกค้าเห็น)
alter table public.jobs
  add column if not exists customer_shipping_fee numeric(10,2) not null default 0;

-- นโยบายค่าส่งของร้าน
alter table public.shop_info
  add column if not exists charge_customer_shipping boolean not null default false,
  add column if not exists free_ship_min_qty int not null default 50,
  add column if not exists customer_ship_fee numeric(10,2) not null default 0;
