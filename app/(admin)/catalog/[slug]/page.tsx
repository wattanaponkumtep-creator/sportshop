import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { CatalogItemsManager } from "@/components/catalog/items-manager";
import { createCatalogFileUrls } from "@/app/(admin)/catalog/actions";
import type { CatalogCategory, CatalogItem } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function CatalogCategoryAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("catalog_categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!category) notFound();
  const cat = category as CatalogCategory;

  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("category_id", cat.id)
    .order("position");

  const itemList = (items ?? []) as CatalogItem[];

  // Pre-sign thumbnail URLs server-side
  const thumbnailPaths = itemList
    .map((i) => i.thumbnail_path)
    .filter((p): p is string => !!p);
  const signedUrls = await createCatalogFileUrls(thumbnailPaths);
  const urlMap = new Map(signedUrls.filter((s) => s.url).map((s) => [s.path, s.url as string]));

  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Catalog
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <span>{cat.icon ?? "📦"}</span> {cat.name}
        </h1>
        {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
      </header>

      <CatalogItemsManager
        categoryId={cat.id}
        items={itemList}
        thumbnailUrls={Object.fromEntries(urlMap)}
      />
    </div>
  );
}
