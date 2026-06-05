import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, ChevronRight, Globe } from "lucide-react";
import type { CatalogCategory } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function CatalogAdminPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: counts }] = await Promise.all([
    supabase.from("catalog_categories").select("*").order("position"),
    supabase.from("catalog_items").select("category_id, is_active"),
  ]);

  const countByCategory = new Map<string, { total: number; active: number }>();
  for (const it of (counts ?? []) as { category_id: string; is_active: boolean }[]) {
    const cur = countByCategory.get(it.category_id) ?? { total: 0, active: 0 };
    cur.total++;
    if (it.is_active) cur.active++;
    countByCategory.set(it.category_id, cur);
  }

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <Layers className="h-7 w-7 text-orange-400" /> Catalog (สเปคสินค้า)
          </h1>
          <p className="text-sm text-muted-foreground">
            จัดการรายการ <strong>เนื้อผ้า / คอเสื้อ / ประเภทเสื้อ</strong> ที่จะแสดงในหน้าโชว์เคสให้ลูกค้าดู
          </p>
        </div>
        <Link href="/showcase" target="_blank" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
          <Globe className="h-3.5 w-3.5" /> ดูหน้าสาธารณะ
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {((categories ?? []) as CatalogCategory[]).map((c) => {
          const count = countByCategory.get(c.id) ?? { total: 0, active: 0 };
          return (
            <Link key={c.id} href={`/catalog/${c.slug}`}>
              <Card className="transition hover:border-primary/50 hover:shadow-md">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{c.icon ?? "📦"}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold">{c.name}</div>
                    {c.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {count.total} รายการ
                    </Badge>
                    {count.active < count.total && (
                      <span className="text-[10px] text-muted-foreground">
                        ใช้งาน {count.active}/{count.total}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
