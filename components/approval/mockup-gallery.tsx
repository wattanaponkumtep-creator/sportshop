"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 5;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function filenameFor(url: string, jobCode: string, i: number) {
  let ext = ".jpg";
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.(jpe?g|png|webp|gif)$/i);
    if (m) ext = m[0].toLowerCase();
  } catch {
    /* ignore */
  }
  return `${jobCode}-mockup-${i + 1}${ext}`;
}

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function MockupGallery({
  images,
  jobCode,
  title,
}: {
  images: string[];
  jobCode: string;
  title: string | null;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (images.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">ไม่มีรูป</p>;
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((url, i) =>
          url ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIdx(i)}
              className="group relative block cursor-zoom-in overflow-hidden rounded-lg border border-border bg-background outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`แบบเสื้อ ${i + 1}`}
                className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
                <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  <Maximize2 className="h-3 w-3" /> แตะเพื่อขยาย / ซูม
                </span>
              </div>
            </button>
          ) : (
            <div
              key={i}
              className="flex h-40 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive"
            >
              ⚠ โหลดรูปไม่สำเร็จ
            </div>
          ),
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        <ImageIcon className="mr-1 inline h-3 w-3" />
        แตะที่รูปเพื่อดูขนาดใหญ่ ซูม และดาวน์โหลด
      </p>

      {openIdx !== null && (
        <MockupLightbox
          images={images}
          startIdx={openIdx}
          jobCode={jobCode}
          title={title}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </>
  );
}

function MockupLightbox({
  images,
  startIdx,
  jobCode,
  title,
  onClose,
}: {
  images: string[];
  startIdx: number;
  jobCode: string;
  title: string | null;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const drag = useRef<{ x: number; y: number; bx: number; by: number } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const hasMultiple = images.length > 1;
  const currentImg = images[idx];

  const resetZoom = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const go = useCallback(
    (next: number) => {
      setIdx((next + images.length) % images.length);
      resetZoom();
    },
    [images.length, resetZoom],
  );

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => {
      const next = clamp(s + delta, MIN_SCALE, MAX_SCALE);
      if (next === 1) {
        setTx(0);
        setTy(0);
      }
      return next;
    });
  }, []);

  const toggleZoom = useCallback(() => {
    setScale((s) => {
      if (s > 1) {
        setTx(0);
        setTy(0);
        return 1;
      }
      return 2.5;
    });
  }, []);

  // keyboard
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasMultiple) go(idx - 1);
      else if (e.key === "ArrowRight" && hasMultiple) go(idx + 1);
      else if (e.key === "+" || e.key === "=") zoomBy(0.5);
      else if (e.key === "-") zoomBy(-0.5);
    }
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [idx, hasMultiple, go, zoomBy, onClose]);

  function onWheel(e: React.WheelEvent) {
    zoomBy(e.deltaY < 0 ? 0.3 : -0.3);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, bx: tx, by: ty };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setTx(drag.current.bx + (e.clientX - drag.current.x));
    setTy(drag.current.by + (e.clientY - drag.current.y));
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function handleDownload() {
    if (!currentImg) return;
    setDownloading(true);
    await downloadImage(currentImg, filenameFor(currentImg, jobCode, idx));
    setDownloading(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white sm:px-6 sm:py-3">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] text-white/60">{jobCode}</div>
          <div className="truncate text-sm font-semibold sm:text-base">{title || "แบบเสื้อ"}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => zoomBy(-0.5)}
            disabled={scale <= MIN_SCALE}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-30"
            aria-label="ซูมออก"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="min-w-[3ch] text-center text-xs tabular-nums text-white/70">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => zoomBy(0.5)}
            disabled={scale >= MAX_SCALE}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-30"
            aria-label="ซูมเข้า"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-label="ดาวน์โหลด"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{downloading ? "กำลังโหลด..." : "ดาวน์โหลด"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {hasMultiple && (
          <button
            type="button"
            onClick={() => go(idx - 1)}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-4"
            aria-label="รูปก่อนหน้า"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div
          className="flex h-full w-full items-center justify-center overflow-hidden p-3 sm:p-6"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ cursor: scale > 1 ? "grab" : "zoom-in", touchAction: "none" }}
        >
          {currentImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImg}
              alt={`${title || "แบบเสื้อ"} - รูปที่ ${idx + 1}`}
              onDoubleClick={toggleZoom}
              onClick={(e) => {
                // แตะเดี่ยว = สลับซูม (เฉพาะตอนยังไม่ลาก)
                if (scale === 1) {
                  e.stopPropagation();
                  toggleZoom();
                }
              }}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-100"
              style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
              draggable={false}
            />
          ) : (
            <div className="text-white/60">⚠ โหลดรูปไม่สำเร็จ</div>
          )}
        </div>

        {hasMultiple && (
          <button
            type="button"
            onClick={() => go(idx + 1)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-4"
            aria-label="รูปถัดไป"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {hasMultiple && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {idx + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="border-t border-white/10 px-3 py-2 sm:px-6">
          <div className="flex gap-2 overflow-x-auto">
            {images.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                className={cn(
                  "h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition sm:h-16 sm:w-16",
                  i === idx ? "border-orange-400 opacity-100" : "border-white/20 opacity-60 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/10 bg-black/40 py-2 text-center text-[10px] text-white/40">
        แตะรูปเพื่อซูม • ลากเพื่อเลื่อน • scroll เพื่อซูม{hasMultiple && " • ← / → เปลี่ยนรูป"} • ESC ปิด
      </div>
    </div>
  );
}
