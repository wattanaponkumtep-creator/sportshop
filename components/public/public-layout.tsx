import Link from "next/link";
import { Shirt, Phone, Mail, MapPin } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";

export async function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500">
            <Shirt className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-base sm:text-lg">SportShop</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          <Link href="/showcase" className="rounded-md px-2 py-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground sm:px-3">
            สินค้า
          </Link>
          <Link href="/portfolio" className="rounded-md px-2 py-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground sm:px-3">
            ผลงาน
          </Link>
          <Link href="/quote" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition hover:bg-primary/90 sm:px-4">
            ขอใบเสนอราคา
          </Link>
        </nav>
      </div>
    </header>
  );
}

export async function PublicFooter() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("shop_info").select("shop_name, address, phone, email").eq("id", 1).limit(1);
  const shop = data?.[0] as { shop_name: string | null; address: string | null; phone: string | null; email: string | null } | undefined;

  return (
    <footer className="mt-16 border-t border-border/60 bg-muted/30 py-8">
      <div className="container mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500">
              <Shirt className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-base">{shop?.shop_name ?? "SportShop"}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            ผลิตเสื้อกีฬาคุณภาพสูง พิมพ์ลายซับลิเมชั่น — เน้นความตรงเวลา + คุณภาพดี
          </p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">เมนู</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li><Link href="/showcase" className="hover:text-foreground">สเปคสินค้า</Link></li>
            <li><Link href="/portfolio" className="hover:text-foreground">ผลงานที่ผ่านมา</Link></li>
            <li><Link href="/quote" className="hover:text-foreground">ขอใบเสนอราคา</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">ติดต่อ</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {shop?.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                <a href={`tel:${shop.phone}`} className="hover:text-foreground">{shop.phone}</a>
              </li>
            )}
            {shop?.email && (
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${shop.email}`} className="hover:text-foreground">{shop.email}</a>
              </li>
            )}
            {shop?.address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{shop.address}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-border/60 px-4 pt-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {shop?.shop_name ?? "SportShop"}. All rights reserved.
      </div>
    </footer>
  );
}
