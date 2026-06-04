import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Palette, Sparkles } from "lucide-react";
import { DesignGrid } from "@/components/designs/design-grid";
import { DesignFilters } from "@/components/designs/design-filters";
import { hasActiveDesignFilters, type DesignFilterParams } from "@/lib/designs";
import type { Design } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type SearchParams = DesignFilterParams & { sort?: "recent" | "popular" | "favorite" };

export default async function DesignsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // List query (filtered + paginated)
  let listQuery = supabase.from("designs").select("*");

  if (params.q && params.q.trim()) {
    // Trgm index is on name; codes are short and prefix-known so we search name only
    listQuery = listQuery.ilike("name", `%${params.q.trim()}%`);
  }
  if (params.sport && params.sport !== "all") {
    listQuery = listQuery.eq("sport_type", params.sport);
  }
  if (params.color && params.color !== "all") {
    listQuery = listQuery.contains("colors", [params.color]);
  }
  if (params.sort === "favorite") {
    listQuery = listQuery.eq("is_favorite", true).order("created_at", { ascending: false });
  } else if (params.sort === "popular") {
    listQuery = listQuery.order("use_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    listQuery = listQuery.order("created_at", { ascending: false });
  }

  // Stats query (unfiltered, accurate totals across the whole library)
  const [listResult, totalResult, favResult, totalUsesResult] = await Promise.all([
    listQuery.limit(200),
    supabase.from("designs").select("id", { count: "exact", head: true }),
    supabase.from("designs").select("id", { count: "exact", head: true }).eq("is_favorite", true),
    supabase.from("designs").select("use_count"),
  ]);

  const designs = listResult.data;
  const total = totalResult.count ?? 0;
  const favorites = favResult.count ?? 0;
  const totalUses = (totalUsesResult.data ?? []).reduce(
    (sum, d) => sum + ((d as { use_count: number }).use_count ?? 0),
    0,
  );

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <Palette className="h-7 w-7 text-orange-400" /> คลังดีไซน์
          </h1>
          <p className="text-sm text-muted-foreground">
            แบบเสื้อทั้งหมด • ใช้เป็นพอร์ตโชว์ลูกค้า + นำกลับมาใช้ใหม่ได้
          </p>
        </div>
        <Button asChild>
          <Link href="/designs/new">
            <Plus className="h-4 w-4" /> เพิ่มดีไซน์
          </Link>
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">ดีไซน์ทั้งหมด</div>
            <div className="font-display text-2xl font-bold sm:text-3xl">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">⭐ ที่ชอบ</div>
            <div className="font-display text-2xl font-bold text-amber-400 sm:text-3xl">{favorites}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline h-3 w-3" /> ใช้ทำงาน
            </div>
            <div className="font-display text-2xl font-bold text-cyan-400 sm:text-3xl">{totalUses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <DesignFilters
        defaultQ={params.q ?? ""}
        defaultSport={params.sport ?? "all"}
        defaultColor={params.color ?? "all"}
        defaultSort={params.sort ?? "recent"}
      />

      {/* Grid */}
      {!designs || designs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Palette className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium">
                {hasActiveDesignFilters(params) ? "ไม่พบดีไซน์ที่ค้นหา" : "ยังไม่มีดีไซน์ในคลัง"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                เพิ่มแบบเสื้อแบบแรก — ทำให้ง่ายต่อการแสดงพอร์ตให้ลูกค้า
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/designs/new">
                <Plus className="h-4 w-4" /> เพิ่มดีไซน์แรก
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DesignGrid designs={designs as Design[]} />
      )}
    </div>
  );
}
