import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Clock, Shield, Award, Palette, Layers, MessageCircle, Star } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public/public-layout";
import { SPORT_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PublicDesign = {
  id: string;
  code: string;
  name: string;
  sport_type: string | null;
  thumbnail_path: string | null;
};

type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  items: { id: string; name: string }[];
};

export default async function HomePage() {
  const supabase = createServiceClient();

  const [{ data: portfolioData }, { data: catalogData }, { data: shopRows }] = await Promise.all([
    supabase.rpc("get_public_portfolio"),
    supabase.rpc("get_public_catalog"),
    supabase.from("shop_info").select("shop_name, phone").eq("id", 1).limit(1),
  ]);

  const allDesigns = (portfolioData as unknown as PublicDesign[]) ?? [];
  const featuredDesigns = allDesigns.slice(0, 8);
  const categories = (catalogData as unknown as CatalogCategory[]) ?? [];
  const shop = shopRows?.[0] as { shop_name: string | null; phone: string | null } | undefined;
  const shopName = shop?.shop_name ?? "SportShop";

  // Sign portfolio thumbnails (1 batch)
  const thumbs = featuredDesigns.map((d) => d.thumbnail_path).filter((p): p is string => !!p);
  const urlMap = new Map<string, string>();
  if (thumbs.length > 0) {
    const { data: signed } = await supabase.storage.from("job-files").createSignedUrls(thumbs, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
  }

  return (
    <>
      <PublicHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-500/15 via-background to-rose-500/10 py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <Badge className="mb-4 bg-orange-500/15 text-orange-300 backdrop-blur">
              <Sparkles className="mr-1 h-3 w-3" /> ผลิตเสื้อกีฬาคุณภาพ พิมพ์ลายซับลิเมชั่น
            </Badge>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
                {shopName}
              </span>
              <br />
              เสื้อกีฬาทีมคุณ — เนี้ยบ ทันเวลา
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              ออกแบบเสื้อทีม / สโมสร / ทัวร์นาเมนต์ — เลือกเนื้อผ้า + คอเสื้อ + แบบได้ตามต้องการ
              <br />ส่งตรงเวลา ราคาเป็นกันเอง
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8 sm:gap-3">
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:shadow-orange-500/50 sm:text-base"
              >
                <Sparkles className="h-4 w-4" /> ขอใบเสนอราคาฟรี <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/40 px-6 py-3 text-sm font-semibold transition hover:bg-accent sm:text-base"
              >
                <Palette className="h-4 w-4" /> ดูผลงาน
              </Link>
            </div>

            <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3 text-center sm:mt-14">
              {[
                { label: "ผลงานที่ทำ", value: `${allDesigns.length}+`, color: "text-orange-400" },
                { label: "ประเภทเสื้อ", value: `${categories.find((c) => c.slug === "product")?.items.length ?? 10}+`, color: "text-cyan-400" },
                { label: "เนื้อผ้าให้เลือก", value: `${categories.find((c) => c.slug === "fabric")?.items.length ?? 5}+`, color: "text-emerald-400" },
              ].map((s) => (
                <div key={s.label}>
                  <div className={`font-display text-2xl font-bold sm:text-4xl ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground sm:text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="border-y border-border/60 bg-card/30 py-12 sm:py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">ทำไมเลือกเรา?</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Clock, title: "ส่งตรงเวลา", desc: "ไม่ส่งช้า ไม่เลื่อนงาน — มีระบบ tracking ทุก JOB" },
                { icon: Award, title: "คุณภาพดี", desc: "เลือกใช้แต่ผ้าคุณภาพดี + พิมพ์สีคมชัด" },
                { icon: Shield, title: "รับประกัน", desc: "ของไม่ตรงสเปค ยินดีแก้ไข + คืนเงิน" },
                { icon: Sparkles, title: "ราคาเป็นกันเอง", desc: "สั่งจำนวนน้อยก็ทำให้ ไม่บังคับ MOQ ใหญ่" },
              ].map((f) => (
                <Card key={f.title} className="border-border bg-card/40">
                  <CardContent className="p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* PORTFOLIO PREVIEW */}
        {featuredDesigns.length > 0 && (
          <section className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">ผลงานที่ผ่านมา</h2>
                <p className="mt-1 text-sm text-muted-foreground">ตัวอย่างเสื้อที่เราออกแบบและผลิต</p>
              </div>
              <Link href="/portfolio" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                ดูทั้งหมด <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {featuredDesigns.map((d) => (
                <Link key={d.id} href="/portfolio">
                  <Card className="group overflow-hidden p-0 transition hover:border-primary/50 hover:shadow-lg">
                    <div className="aspect-square overflow-hidden bg-muted">
                      {d.thumbnail_path && urlMap.get(d.thumbnail_path) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={urlMap.get(d.thumbnail_path)!}
                          alt={d.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Palette className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="line-clamp-1 text-xs font-semibold">{d.name}</div>
                      {d.sport_type && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {SPORT_LABEL[d.sport_type] ?? d.sport_type}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CATALOG TEASER */}
        {categories.length > 0 && (
          <section className="border-y border-border/60 bg-card/30 py-12 sm:py-16">
            <div className="container mx-auto max-w-6xl px-4">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold sm:text-3xl">เลือกได้ตามสไตล์ทีมคุณ</h2>
                <p className="mt-1 text-sm text-muted-foreground">เนื้อผ้า / คอเสื้อ / ประเภท หลากหลายแบบ</p>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.slice(0, 6).map((c) => (
                  <Link key={c.id} href={`/showcase#${c.slug}`}>
                    <Card className="transition hover:border-primary/50 hover:shadow-md">
                      <CardContent className="flex items-center gap-4 p-4">
                        <span className="text-3xl">{c.icon ?? "📦"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{c.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {c.items.length} แบบ
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link href="/showcase" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">
                  <Layers className="h-4 w-4" /> ดูสเปคทั้งหมด
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* FINAL CTA */}
        <section className="border-t border-border/60 bg-gradient-to-br from-orange-500/10 to-rose-500/10 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">พร้อมเริ่มออกแบบเสื้อทีมคุณแล้ว?</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
              ฝากชื่อ-เบอร์ทิ้งไว้ ทางร้านติดต่อกลับภายใน 24 ชม.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:shadow-orange-500/50"
              >
                <Sparkles className="h-5 w-5" /> ขอใบเสนอราคาฟรี
              </Link>
              {shop?.phone && (
                <a
                  href={`tel:${shop.phone}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3 text-base font-semibold backdrop-blur transition hover:bg-accent"
                >
                  <MessageCircle className="h-5 w-5" /> โทร {shop.phone}
                </a>
              )}
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-6 py-3 text-sm font-medium text-muted-foreground transition hover:bg-accent"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
