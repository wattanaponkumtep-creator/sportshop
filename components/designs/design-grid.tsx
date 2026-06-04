"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ImageIcon, Sparkles } from "lucide-react";
import { SPORT_LABEL, DESIGN_COLOR_HEX, DESIGN_COLOR_LABEL } from "@/lib/constants";
import { formatDateTH, cn } from "@/lib/utils";
import { toggleFavoriteDesign, createDesignFileUrls } from "@/app/(admin)/designs/actions";
import { toast } from "@/components/ui/use-toast";
import type { Design } from "@/lib/types/database";

export function DesignGrid({ designs }: { designs: Design[] }) {
  // Pre-fetch signed URLs for all thumbnails in batch
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const paths = designs.map((d) => d.thumbnail_path).filter((p): p is string => !!p);
    if (paths.length === 0) return;
    createDesignFileUrls(paths).then((results) => {
      const map: Record<string, string> = {};
      for (const r of results) {
        if (r.url) map[r.path] = r.url;
      }
      setUrls(map);
    });
  }, [designs]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {designs.map((d) => (
        <DesignCard key={d.id} design={d} thumbnailUrl={d.thumbnail_path ? urls[d.thumbnail_path] : undefined} />
      ))}
    </div>
  );
}

function DesignCard({ design, thumbnailUrl }: { design: Design; thumbnailUrl?: string }) {
  const [fav, setFav] = useState(design.is_favorite);
  const [pending, setPending] = useState(false);

  async function handleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    const next = !fav;
    setFav(next);
    const res = await toggleFavoriteDesign(design.id, next);
    if (!res.ok) {
      setFav(!next);
      toast({ title: "บันทึกไม่สำเร็จ", description: res.error, variant: "destructive" });
    }
    setPending(false);
  }

  return (
    <Link href={`/designs/${design.id}`} className="group block">
      <Card className="overflow-hidden p-0 transition hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={design.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/30 to-muted/60 text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}

          {/* Top overlay: code + favorite */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-2">
            <Badge variant="outline" className="border-white/30 bg-black/40 font-mono text-[10px] text-white backdrop-blur">
              {design.code}
            </Badge>
            <button
              type="button"
              onClick={handleFav}
              disabled={pending}
              className={cn(
                "rounded-full bg-black/40 p-1.5 text-white backdrop-blur transition hover:bg-black/60",
                fav && "text-amber-300"
              )}
              aria-label={fav ? "เลิกชอบ" : "ชอบ"}
            >
              <Star className={cn("h-3.5 w-3.5", fav && "fill-current")} />
            </button>
          </div>

          {/* Bottom overlay: use count */}
          {design.use_count > 0 && (
            <div className="absolute bottom-0 right-0 m-2">
              <Badge className="border-cyan-500/40 bg-cyan-500/20 text-[10px] text-cyan-300 backdrop-blur">
                <Sparkles className="mr-0.5 h-3 w-3" /> ใช้แล้ว {design.use_count}
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 p-3">
          <div className="line-clamp-1 text-sm font-semibold leading-tight">{design.name}</div>

          <div className="flex flex-wrap items-center gap-1">
            {design.sport_type && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {SPORT_LABEL[design.sport_type] ?? design.sport_type}
              </Badge>
            )}
          </div>

          {/* Color dots */}
          {design.colors.length > 0 && (
            <div className="flex items-center gap-1">
              {design.colors.slice(0, 6).map((c) => (
                <span
                  key={c}
                  title={DESIGN_COLOR_LABEL[c] ?? c}
                  className="inline-block h-3 w-3 rounded-full border border-border/60"
                  style={{ backgroundColor: DESIGN_COLOR_HEX[c] ?? c }}
                />
              ))}
              {design.colors.length > 6 && (
                <span className="text-[10px] text-muted-foreground">+{design.colors.length - 6}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
            <span>{formatDateTH(design.created_at, "d MMM yy")}</span>
            {design.suggested_price && design.suggested_price > 0 && (
              <span className="font-mono font-semibold text-orange-400">
                ฿{Number(design.suggested_price).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

