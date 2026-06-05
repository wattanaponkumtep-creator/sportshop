import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public/public-layout";

export const dynamic = "force-dynamic";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_path: string | null;
  image_paths: string[];
  attributes: Record<string, unknown>;
};

type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  items: CatalogItem[];
};

export default async function ShowcasePage() {
  const supabase = createServiceClient();
  const { data } = await supabase.rpc("get_public_catalog");
  const categories = (data as unknown as CatalogCategory[]) ?? [];

  // Pre-sign first thumbnail of first 4 items per category for preview
  const allThumbs = categories
    .flatMap((c) => c.items.slice(0, 4).map((i) => i.thumbnail_path))
    .filter((p): p is string => !!p);
  const uniqueThumbs = [...new Set(allThumbs)];
  const urlMap = new Map<string, string>();
  if (uniqueThumbs.length > 0) {
    const { data: signed } = await supabase.storage.from("job-files").createSignedUrls(uniqueThumbs, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
    }
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-orange-500/10 via-background to-background py-12 sm:py-16">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              สเปคสินค้าและวัสดุ
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              เลือกชม <strong>เนื้อผ้า / คอเสื้อ / ประเภทเสื้อ</strong> ที่เรามีให้บริการ
            </p>
            <div className="mt-6">
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:shadow-orange-500/40"
              >
                <Sparkles className="h-4 w-4" /> ขอใบเสนอราคาฟรี <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
          {categories.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
              ยังไม่มีข้อมูลสินค้า — กรุณาเพิ่มในระบบ admin
            </div>
          ) : (
            <div className="space-y-12">
              {categories.map((cat) => (
                <CategorySection key={cat.id} category={cat} urlMap={urlMap} />
              ))}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}

function CategorySection({ category, urlMap }: { category: CatalogCategory; urlMap: Map<string, string> }) {
  if (category.items.length === 0) return null;

  return (
    <section id={category.slug}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold sm:text-2xl">
            <span className="text-2xl">{category.icon ?? "📦"}</span> {category.name}
          </h2>
          {category.description && (
            <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
        <Badge variant="outline">{category.items.length} แบบ</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {category.items.map((item) => (
          <Card key={item.id} className="overflow-hidden transition hover:border-primary/50 hover:shadow-lg">
            <div className="aspect-square bg-muted">
              {item.thumbnail_path && urlMap.get(item.thumbnail_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlMap.get(item.thumbnail_path)!}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl">
                  {category.icon ?? "📦"}
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <div className="font-semibold">{item.name}</div>
              {item.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
              )}
              {Object.keys(item.attributes ?? {}).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(item.attributes ?? {}).slice(0, 3).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-[10px]">
                      <span className="text-muted-foreground">{k}:</span>
                      <span className="ml-1 font-medium">{String(v)}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
