import type { Design } from "@/lib/types/database";

/**
 * Return image paths with the thumbnail first.
 * Used by detail page + form to render gallery in consistent order.
 */
export function orderedDesignImages(d: Pick<Design, "thumbnail_path" | "image_paths">): string[] {
  if (!d.thumbnail_path) return d.image_paths;
  return [d.thumbnail_path, ...d.image_paths.filter((p) => p !== d.thumbnail_path)];
}

export type DesignFilterParams = {
  q?: string;
  sport?: string;
  color?: string;
  sort?: string;
};

export function hasActiveDesignFilters(p: DesignFilterParams): boolean {
  return Boolean(
    (p.q && p.q.trim()) ||
      (p.sport && p.sport !== "all") ||
      (p.color && p.color !== "all") ||
      (p.sort && p.sort !== "recent"),
  );
}
