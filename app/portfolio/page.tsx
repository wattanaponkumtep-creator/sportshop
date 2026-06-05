import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Palette, Sparkles } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public/public-layout";
import { SPORT_LABEL, DESIGN_COLOR_HEX } from "@/lib/constants";

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

  // Pre-sign thumbnails
  const thumbs = designs.map((d) => d.thumbnail_path).filter((p): p is string => !!p);
  const urlMap = new Map<string, string>();
  if (thumbs.length > 0) {
    const { data: signed } = await supabase.storage.from("job-files").createSignedUrls(thumbs, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
    }
  }

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
              ตัวอย่างเสื้อกีฬาที่เราออกแบบและผลิต — เลือกแบบที่ชอบเพื่อขอใบเสนอราคา
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
          {designs.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
              ยังไม่มีผลงานเผยแพร่ — กรุณาเปิดเผยแพร่ในระบบ admin (ติ๊ก &quot;เผยแพร่สาธารณะ&quot; ที่แต่ละดีไซน์)
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {designs.map((d) => (
                <PortfolioCard key={d.id} design={d} thumbnailUrl={d.thumbnail_path ? urlMap.get(d.thumbnail_path) : undefined} />
              ))}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}

function PortfolioCard({ design, thumbnailUrl }: { design: PublicDesign; thumbnailUrl?: string }) {
  return (
    <Card className="group overflow-hidden p-0 transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="aspect-square overflow-hidden bg-muted">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={design.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-muted-foreground">
            <Palette className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <div className="line-clamp-1 text-sm font-semibold">{design.name}</div>
        <div className="flex flex-wrap items-center gap-1">
          {design.sport_type && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {SPORT_LABEL[design.sport_type] ?? design.sport_type}
            </Badge>
          )}
          {design.colors.slice(0, 4).map((c) => (
            <span
              key={c}
              className="inline-block h-3 w-3 rounded-full border border-border/60"
              style={{ backgroundColor: DESIGN_COLOR_HEX[c] ?? c }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
