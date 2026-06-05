import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { ArrowRight, Palette, Sparkles } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public/public-layout";
import { PortfolioGallery, type GalleryDesign } from "@/components/public/portfolio-gallery";

export const dynamic = "force-dynamic";

type PublicDesign = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sport_type: string | null;
  colors: string[];
  tags: string[];
  thumbnail_path: string | null;
  image_paths: string[];
  created_at: string;
};

export default async function PortfolioPage() {
  const supabase = createServiceClient();
  const { data } = await supabase.rpc("get_public_portfolio");
  const designs = (data as unknown as PublicDesign[]) ?? [];

  // Collect ALL image paths from every design (not just thumbnails)
  // — so the lightbox can show full-resolution images for any design
  const ordered = designs.map((d) => {
    const all = d.thumbnail_path
      ? [d.thumbnail_path, ...d.image_paths.filter((p) => p !== d.thumbnail_path)]
      : d.image_paths;
    return { design: d, paths: all };
  });

  const allPaths = [...new Set(ordered.flatMap((o) => o.paths))];

  const urlMap = new Map<string, string>();
  if (allPaths.length > 0) {
    // Batch signed URLs in one round-trip
    const { data: signed } = await supabase.storage.from("job-files").createSignedUrls(allPaths, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
    }
  }

  const galleryDesigns: GalleryDesign[] = ordered.map((o) => ({
    id: o.design.id,
    code: o.design.code,
    name: o.design.name,
    description: o.design.description,
    sport_type: o.design.sport_type,
    colors: o.design.colors,
    tags: o.design.tags,
    signed_urls: o.paths.map((p) => urlMap.get(p)).filter((u): u is string => !!u),
  }));

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-purple-500/10 via-background to-background py-12 sm:py-16">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
              <Palette className="h-6 w-6 text-purple-400" />
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              ผลงานที่เคยทำ
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              ตัวอย่างเสื้อกีฬาที่เราออกแบบและผลิต — <strong>คลิกที่รูปเพื่อดูใหญ่/ลายละเอียด</strong>
            </p>
            <div className="mt-6">
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:shadow-orange-500/40"
              >
                <Sparkles className="h-4 w-4" /> ขอใบเสนอราคา <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
          {galleryDesigns.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
              ยังไม่มีผลงานเผยแพร่ — กรุณาเปิดเผยแพร่ในระบบ admin (ติ๊ก &quot;เผยแพร่สาธารณะ&quot; ที่แต่ละดีไซน์)
            </div>
          ) : (
            <PortfolioGallery designs={galleryDesigns} />
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
