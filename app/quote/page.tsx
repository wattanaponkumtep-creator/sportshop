import { PublicHeader, PublicFooter } from "@/components/public/public-layout";
import { Sparkles, Clock, Shield, Award, Truck } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { QuoteForm } from "./quote-form";

export const dynamic = "force-dynamic";

export default async function QuotePage() {
  const supabase = createServiceClient();
  const { data: shopRows } = await supabase
    .from("shop_info")
    .select("charge_customer_shipping, free_ship_min_qty, customer_ship_fee")
    .eq("id", 1)
    .limit(1);
  const shop = shopRows?.[0] as { charge_customer_shipping?: boolean; free_ship_min_qty?: number; customer_ship_fee?: number } | undefined;
  const shipPolicy =
    shop?.charge_customer_shipping && Number(shop.customer_ship_fee) > 0
      ? { minQty: Number(shop.free_ship_min_qty), fee: Number(shop.customer_ship_fee) }
      : null;
  const fmtBaht = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-orange-500/15 via-background to-background py-12 sm:py-16">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              ขอใบเสนอราคาฟรี
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              กรอกฟอร์มสั้นๆ ทางร้านจะติดต่อกลับภายใน <strong className="text-foreground">24 ชม.</strong>
            </p>
          </div>
        </section>

        {/* 3 Benefits */}
        <section className="container mx-auto max-w-4xl px-4 pb-2">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Clock, title: "ตอบเร็ว", desc: "ภายใน 24 ชม." },
              { icon: Shield, title: "ฟรี", desc: "ไม่มีค่าใช้จ่าย" },
              { icon: Award, title: "ปรึกษาฟรี", desc: "แนะนำเนื้อผ้า + แบบ" },
            ].map((b) => (
              <div key={b.title} className="rounded-lg border border-border bg-card/40 p-3 text-center">
                <b.icon className="mx-auto h-5 w-5 text-orange-400" />
                <div className="mt-1.5 text-sm font-semibold">{b.title}</div>
                <div className="text-xs text-muted-foreground">{b.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* นโยบายค่าส่ง */}
        {shipPolicy && (
          <section className="container mx-auto max-w-4xl px-4 pt-3">
            <div className="flex items-start gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 sm:p-4">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
              <div className="text-sm">
                <div className="font-semibold text-cyan-200">นโยบายค่าจัดส่ง</div>
                <div className="mt-0.5 text-muted-foreground">
                  สั่งตั้งแต่ <strong className="text-foreground">{shipPolicy.minQty} ตัวขึ้นไป — ส่งฟรี</strong> ·
                  สั่งน้อยกว่า {shipPolicy.minQty} ตัว มีค่าจัดส่ง <strong className="text-foreground">{fmtBaht(shipPolicy.fee)}</strong> (คิดรวมในใบเสนอราคา)
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Form */}
        <section className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
          <QuoteForm />
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
