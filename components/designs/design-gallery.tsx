"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createDesignFileUrls } from "@/app/(admin)/designs/actions";
import { ImageIcon, X } from "lucide-react";

export function DesignGallery({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (paths.length === 0) return;
    createDesignFileUrls(paths).then((results) => {
      setUrls(results.map((r) => r.url ?? ""));
    });
  }, [paths]);

  if (paths.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
        <ImageIcon className="h-12 w-12" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Main image */}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="block aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted transition hover:border-primary"
        >
          {urls[active] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[active]} alt={`รูปที่ ${active + 1}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
        </button>

        {/* Thumbnails */}
        {paths.length > 1 && (
          <div className="grid grid-cols-5 gap-1.5">
            {paths.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActive(idx)}
                className={cn(
                  "aspect-square overflow-hidden rounded-md border-2 transition",
                  idx === active ? "border-primary" : "border-border opacity-60 hover:opacity-100"
                )}
              >
                {urls[idx] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[idx]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full bg-muted" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && urls[active] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[active]}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
