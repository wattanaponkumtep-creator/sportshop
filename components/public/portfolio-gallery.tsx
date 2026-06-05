"use client";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Palette, X, ChevronLeft, ChevronRight, Sparkles, Tag, ImageIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SPORT_LABEL, DESIGN_COLOR_HEX, DESIGN_COLOR_LABEL } from "@/lib/constants";

export type GalleryDesign = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sport_type: string | null;
  colors: string[];
  tags: string[];
  /** ordered: thumbnail first, then rest */
  signed_urls: string[];
};

export function PortfolioGallery({ designs }: { designs: GalleryDesign[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [imageIdx, setImageIdx] = useState(0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {designs.map((d, i) => (
          <PortfolioCard
            key={d.id}
            design={d}
            onClick={() => {
              setOpenIdx(i);
              setImageIdx(0);
            }}
          />
        ))}
      </div>

      {openIdx !== null && designs[openIdx] && (
        <DesignLightbox
          design={designs[openIdx]}
          imageIdx={imageIdx}
          setImageIdx={setImageIdx}
          onClose={() => setOpenIdx(null)}
          onPrevDesign={openIdx > 0 ? () => { setOpenIdx(openIdx - 1); setImageIdx(0); } : null}
          onNextDesign={openIdx < designs.length - 1 ? () => { setOpenIdx(openIdx + 1); setImageIdx(0); } : null}
        />
      )}
    </>
  );
}

function PortfolioCard({ design, onClick }: { design: GalleryDesign; onClick: () => void }) {
  const thumb = design.signed_urls[0];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group cursor-zoom-in select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
    >
      <Card className="overflow-hidden p-0 transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={design.name}
              className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-muted-foreground">
              <Palette className="h-10 w-10" />
            </div>
          )}
          {design.signed_urls.length > 1 && (
            <Badge className="absolute right-2 top-2 border-white/30 bg-black/60 text-[10px] text-white backdrop-blur">
              <ImageIcon className="mr-0.5 h-2.5 w-2.5" /> {design.signed_urls.length}
            </Badge>
          )}
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
            <span className="mb-3 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              🔍 คลิกดูรายละเอียด
            </span>
          </div>
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
                title={DESIGN_COLOR_LABEL[c] ?? c}
                className="inline-block h-3 w-3 rounded-full border border-border/60"
                style={{ backgroundColor: DESIGN_COLOR_HEX[c] ?? c }}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function DesignLightbox({
  design,
  imageIdx,
  setImageIdx,
  onClose,
  onPrevDesign,
  onNextDesign,
}: {
  design: GalleryDesign;
  imageIdx: number;
  setImageIdx: (i: number) => void;
  onClose: () => void;
  onPrevDesign: (() => void) | null;
  onNextDesign: (() => void) | null;
}) {
  const images = design.signed_urls;
  const hasMultiple = images.length > 1;
  const currentImg = images[imageIdx];

  const prevImg = useCallback(() => {
    if (!hasMultiple) return;
    setImageIdx((imageIdx - 1 + images.length) % images.length);
  }, [hasMultiple, imageIdx, images.length, setImageIdx]);
  const nextImg = useCallback(() => {
    if (!hasMultiple) return;
    setImageIdx((imageIdx + 1) % images.length);
  }, [hasMultiple, imageIdx, images.length, setImageIdx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") {
        if (hasMultiple) prevImg();
        else if (onPrevDesign) onPrevDesign();
      } else if (e.key === "ArrowRight") {
        if (hasMultiple) nextImg();
        else if (onNextDesign) onNextDesign();
      }
    }
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [hasMultiple, prevImg, nextImg, onClose, onPrevDesign, onNextDesign]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white sm:px-6 sm:py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="border-white/30 font-mono text-[10px] text-white">
              {design.code}
            </Badge>
            <span className="truncate text-sm font-semibold sm:text-base">{design.name}</span>
          </div>
          {design.sport_type && (
            <div className="mt-0.5 text-xs text-white/60">
              {SPORT_LABEL[design.sport_type] ?? design.sport_type}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="ปิด"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main image */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultiple && (
          <button
            type="button"
            onClick={prevImg}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-4"
            aria-label="รูปก่อนหน้า"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {currentImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImg}
            alt={`${design.name} - รูปที่ ${imageIdx + 1}`}
            className="max-h-full max-w-full select-none object-contain"
            draggable={false}
          />
        ) : (
          <div className="text-white/60">
            <Palette className="h-12 w-12" />
          </div>
        )}

        {hasMultiple && (
          <button
            type="button"
            onClick={nextImg}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-4"
            aria-label="รูปถัดไป"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {hasMultiple && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {imageIdx + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails strip */}
      {hasMultiple && (
        <div
          className="border-t border-white/10 px-3 py-2 sm:px-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 overflow-x-auto">
            {images.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setImageIdx(i)}
                className={cn(
                  "h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition sm:h-16 sm:w-16",
                  i === imageIdx
                    ? "border-orange-400 opacity-100"
                    : "border-white/20 opacity-60 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom: details + CTA */}
      <div
        className="border-t border-white/10 bg-black/60 px-3 py-3 text-white sm:px-6 sm:py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {design.description && (
              <p className="line-clamp-2 text-xs text-white/80 sm:text-sm">{design.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {design.colors.length > 0 && (
                <div className="inline-flex items-center gap-1">
                  <Palette className="h-3 w-3 text-white/60" />
                  {design.colors.map((c) => (
                    <span
                      key={c}
                      title={DESIGN_COLOR_LABEL[c] ?? c}
                      className="inline-block h-3.5 w-3.5 rounded-full border border-white/30"
                      style={{ backgroundColor: DESIGN_COLOR_HEX[c] ?? c }}
                    />
                  ))}
                </div>
              )}
              {design.tags.slice(0, 5).map((t) => (
                <Badge key={t} variant="outline" className="border-white/30 text-[10px] text-white">
                  <Tag className="mr-0.5 h-2.5 w-2.5" />
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            asChild
            className="shrink-0 bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:shadow-lg"
          >
            <Link href={`/quote?ref=${design.code}`}>
              <Sparkles className="h-4 w-4" /> ขอใบเสนอราคาแบบนี้
            </Link>
          </Button>
        </div>

        {(onPrevDesign || onNextDesign) && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2 sm:pt-3">
            <button
              type="button"
              onClick={onPrevDesign ?? undefined}
              disabled={!onPrevDesign}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> ดีไซน์ก่อนหน้า
            </button>
            <span className="text-[10px] text-white/40">⌨ ← / → เลื่อน • ESC ปิด</span>
            <button
              type="button"
              onClick={onNextDesign ?? undefined}
              disabled={!onNextDesign}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 disabled:opacity-30"
            >
              ดีไซน์ถัดไป <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
