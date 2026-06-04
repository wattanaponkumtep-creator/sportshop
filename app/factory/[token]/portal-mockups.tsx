"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Palette, Download, X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn, formatDateTH } from "@/lib/utils";

export type SignedMockup = {
  id: string;
  version: number;
  title: string | null;
  description: string | null;
  decided_at: string | null;
  decision_note: string | null;
  images: { path: string; url: string }[];
};

export function FactoryPortalMockups({ mockups }: { mockups: SignedMockup[] }) {
  const [lightbox, setLightbox] = useState<{ images: { url: string }[]; index: number } | null>(null);

  if (mockups.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-purple-400" /> 🎨 แบบเสื้อ (Mockup)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีแบบเสื้อที่อนุมัติ — รอลูกค้าอนุมัติแบบก่อน
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex flex-wrap items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-purple-400" /> 🎨 แบบเสื้อ (Mockup) — อนุมัติแล้ว
            <Badge className="bg-emerald-500/30 text-emerald-200">✓ พร้อมผลิต</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-purple-500/30 bg-purple-500/10 p-2.5 text-xs text-purple-200">
            💡 <strong>สำคัญ:</strong> นี่คือแบบที่ลูกค้าอนุมัติแล้ว — ผลิตให้ตรงตามนี้ทุกประการ
          </div>
          {mockups.map((m) => (
            <MockupCard
              key={m.id}
              mockup={m}
              onOpenLightbox={(idx) => setLightbox({ images: m.images, index: idx })}
            />
          ))}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox((l) => l && { ...l, index: (l.index - 1 + l.images.length) % l.images.length })}
          onNext={() => setLightbox((l) => l && { ...l, index: (l.index + 1) % l.images.length })}
        />
      )}
    </>
  );
}

function MockupCard({
  mockup,
  onOpenLightbox,
}: {
  mockup: SignedMockup;
  onOpenLightbox: (idx: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">v{mockup.version}</Badge>
          {mockup.title && <span className="font-semibold">{mockup.title}</span>}
        </div>
        {mockup.decided_at && (
          <span className="text-[11px] text-muted-foreground">
            อนุมัติ {formatDateTH(mockup.decided_at, "d MMM yy")}
          </span>
        )}
      </div>

      {/* Description / approval note */}
      {(mockup.description || mockup.decision_note) && (
        <div className="mb-3 space-y-1.5 text-sm text-muted-foreground">
          {mockup.description && <p className="whitespace-pre-wrap">{mockup.description}</p>}
          {mockup.decision_note && (
            <p className="whitespace-pre-wrap rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs text-emerald-200">
              💬 ลูกค้า: {mockup.decision_note}
            </p>
          )}
        </div>
      )}

      {/* Image gallery */}
      {mockup.images.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-2",
            mockup.images.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3",
          )}
        >
          {mockup.images.map((img, idx) => (
            <button
              key={img.path}
              type="button"
              onClick={() => onOpenLightbox(idx)}
              className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted transition hover:border-purple-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Mockup v${mockup.version} - รูปที่ ${idx + 1}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                <span className="rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                  🔍 คลิกเพื่อขยาย
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Download all */}
      {mockup.images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {mockup.images.map((img, idx) => (
            <Button key={img.path} asChild size="sm" variant="outline" className="text-xs">
              <a href={img.url} download={`mockup-v${mockup.version}-${idx + 1}.jpg`}>
                <Download className="h-3 w-3" /> ดาวน์โหลดรูปที่ {idx + 1}
              </a>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: { url: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const current = images[index];
  if (!current) return null;
  const hasMultiple = images.length > 1;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6 sm:top-6"
        aria-label="ปิด"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image counter */}
      {hasMultiple && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white sm:top-6">
          {index + 1} / {images.length}
        </div>
      )}

      {/* Prev */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-4"
          aria-label="ก่อนหน้า"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4"
          aria-label="ถัดไป"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Download */}
      <a
        href={current.url}
        download
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
      >
        <Download className="h-3.5 w-3.5" /> ดาวน์โหลด
      </a>
    </div>
  );
}
