"use client";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ruler } from "lucide-react";
import type { JobItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function SizeSummary({ items }: { items: JobItem[] }) {
  const summary = useMemo(() => {
    const bySize = new Map<string, { count: number; people: string[] }>();
    let noSizeCount = 0;
    let total = 0;
    for (const it of items) {
      const qty = it.quantity ?? 1;
      total += qty;
      const size = (it.size || "").trim();
      if (!size) {
        noSizeCount += qty;
        continue;
      }
      const cur = bySize.get(size) ?? { count: 0, people: [] };
      cur.count += qty;
      if (it.name) cur.people.push(it.name);
      bySize.set(size, cur);
    }
    const sorted = Array.from(bySize.entries())
      .map(([size, info]) => ({ size, ...info }))
      .sort((a, b) => {
        const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
        const ai = order.indexOf(a.size.toUpperCase());
        const bi = order.indexOf(b.size.toUpperCase());
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.size.localeCompare(b.size);
      });
    return { sorted, total, noSizeCount };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold">สรุปจำนวนตามไซส์</h3>
          </div>
          <Badge variant="outline" className="text-xs">รวม {summary.total} ตัว</Badge>
        </div>

        {summary.sorted.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">ยังไม่ได้กรอกไซส์ในรายชื่อ</p>
        ) : (
          <div className="space-y-1.5">
            {summary.sorted.map((row) => {
              const pct = summary.total > 0 ? (row.count / summary.total) * 100 : 0;
              return (
                <div key={row.size} className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-2.5">
                  <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-sm font-bold text-cyan-400">
                    {row.size}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{row.count} ตัว</span>
                      <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {row.people.length > 0 && row.people.length <= 5 && (
                      <div className="mt-1 truncate text-[10px] text-muted-foreground">
                        {row.people.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {summary.noSizeCount > 0 && (
              <div className={cn(
                "rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300"
              )}>
                ⚠️ มี {summary.noSizeCount} แถวยังไม่ได้กรอกไซส์
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
