"use client";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import type { JobItem } from "@/lib/types/database";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

function sortSizes(sizes: string[]): string[] {
  return sizes.slice().sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.toUpperCase());
    const bi = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function ItemTypeSummary({ items }: { items: JobItem[] }) {
  const summary = useMemo(() => {
    const grouped = new Map<string, Map<string, number>>(); // type → size → count
    const allSizes = new Set<string>();
    let grandTotal = 0;

    for (const it of items) {
      const qty = it.quantity ?? 1;
      grandTotal += qty;
      const type = (it.item_type ?? "").trim() || "ไม่ระบุประเภท";
      const size = (it.size ?? "").trim().toUpperCase() || "ไม่ระบุ";

      if (!grouped.has(type)) grouped.set(type, new Map());
      const sizes = grouped.get(type)!;
      sizes.set(size, (sizes.get(size) ?? 0) + qty);
      allSizes.add(size);
    }

    return {
      types: Array.from(grouped.entries()).map(([type, sizes]) => ({
        type,
        sizes: Object.fromEntries(sizes),
        total: Array.from(sizes.values()).reduce((a, b) => a + b, 0),
      })),
      allSizes: sortSizes(Array.from(allSizes)),
      grandTotal,
    };
  }, [items]);

  if (items.length === 0 || summary.types.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-orange-400" /> สรุปตามประเภท / ไซส์
          </div>
          <Badge variant="outline" className="text-xs">รวม {summary.grandTotal} ชิ้น</Badge>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  ประเภท
                </th>
                {summary.allSizes.map((s) => (
                  <th key={s} className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase text-cyan-400">
                    {s}
                  </th>
                ))}
                <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase text-orange-400">
                  รวม
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.types.map((t) => (
                <tr key={t.type} className="border-b border-border/50">
                  <td className="px-2 py-1.5">
                    <Badge variant="outline" className="text-xs">{t.type}</Badge>
                  </td>
                  {summary.allSizes.map((s) => (
                    <td key={s} className="px-2 py-1.5 text-center font-mono text-xs">
                      {t.sizes[s] ? (
                        <span className="font-semibold text-cyan-400">{t.sizes[s]}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-mono text-sm font-bold text-orange-400">
                    {t.total}
                  </td>
                </tr>
              ))}
              {/* Grand total row */}
              <tr className="border-t-2 border-orange-500/40 bg-orange-500/5">
                <td className="px-2 py-1.5 text-xs font-bold uppercase">รวมทั้งหมด</td>
                {summary.allSizes.map((s) => {
                  const total = summary.types.reduce((sum, t) => sum + (t.sizes[s] ?? 0), 0);
                  return (
                    <td key={s} className="px-2 py-1.5 text-center font-mono text-sm font-bold text-cyan-400">
                      {total > 0 ? total : "-"}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-right font-mono text-base font-bold text-orange-400">
                  {summary.grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          💡 ใช้ตารางนี้เช็คตอนรับงานจากโรงงาน — ดูว่าครบทุกประเภท + ทุกไซส์หรือไม่
        </p>
      </CardContent>
    </Card>
  );
}
