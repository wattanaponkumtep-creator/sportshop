"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronDown, ChevronUp, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export type RosterItem = {
  name: string | null;
  number: string | null;
  size: string | null;
  sponsor: string | null;
  item_type: string | null;
  note: string | null;
};

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

// Emoji + color hint based on item type keywords
function iconForType(t: string): { emoji: string; color: string } {
  const lower = t.toLowerCase();
  if (t.includes("ชุด") || t.includes("เซ็ต") || lower.includes("set")) {
    return { emoji: "🩳", color: "text-orange-400" };
  }
  if (t.includes("กางเกง") || lower.includes("pants") || lower.includes("short")) {
    return { emoji: "👖", color: "text-blue-400" };
  }
  if (t.includes("ถุงเท้า") || lower.includes("sock")) {
    return { emoji: "🧦", color: "text-purple-400" };
  }
  if (t.includes("ปลอกแขน") || lower.includes("sleeve")) {
    return { emoji: "💪", color: "text-pink-400" };
  }
  if (t.includes("เสื้อ") || lower.includes("shirt") || lower.includes("jersey")) {
    return { emoji: "👕", color: "text-cyan-400" };
  }
  return { emoji: "📦", color: "text-muted-foreground" };
}

type Group = {
  type: string;
  items: RosterItem[];
  sizeSummary: { size: string; count: number }[];
};

export function FactoryPortalRoster({ items }: { items: RosterItem[] }) {
  const groups: Group[] = useMemo(() => {
    const byType = new Map<string, RosterItem[]>();
    for (const it of items) {
      const t = (it.item_type ?? "").trim() || "ไม่ระบุประเภท";
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(it);
    }
    return Array.from(byType.entries())
      .map(([type, list]) => {
        const sizeCounts = new Map<string, number>();
        for (const it of list) {
          const s = (it.size ?? "").trim().toUpperCase() || "ไม่ระบุ";
          sizeCounts.set(s, (sizeCounts.get(s) ?? 0) + 1);
        }
        return {
          type,
          items: list,
          sizeSummary: sortSizes(Array.from(sizeCounts.keys())).map((s) => ({
            size: s,
            count: sizeCounts.get(s) ?? 0,
          })),
        };
      })
      .sort((a, b) => b.items.length - a.items.length); // most common first
  }, [items]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-cyan-400" /> รายชื่อ / เบอร์ / ไซส์ — แยกตามสินค้า
          <Badge variant="outline" className="ml-1 text-xs">{items.length} ตัว / {groups.length} ประเภท</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((g) => (
          <RosterGroupCard key={g.type} group={g} />
        ))}
        <p className="text-center text-[11px] text-muted-foreground">
          💡 ตรวจสอบจำนวนตามนี้ — รวมทั้งหมดต้องตรงกับที่ระบุในใบงาน
        </p>
      </CardContent>
    </Card>
  );
}

function RosterGroupCard({ group }: { group: Group }) {
  const [expanded, setExpanded] = useState(group.items.length <= 10);
  const { emoji, color } = iconForType(group.type);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/40">
      {/* Group header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 transition hover:bg-accent/40"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className={cn("font-semibold", color)}>{group.type}</span>
          <Badge className="bg-orange-500/20 text-orange-300">{group.items.length} คน</Badge>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Size summary bar — always visible */}
      <div className="border-t border-border bg-muted/20 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="mr-1 text-[10px] uppercase text-muted-foreground">ไซส์:</span>
          {group.sizeSummary.map((s) => (
            <Badge key={s.size} variant="outline" className="font-mono text-[10px]">
              {s.size}: <strong className="ml-1 text-cyan-400">{s.count}</strong>
            </Badge>
          ))}
        </div>
      </div>

      {/* Roster table — collapsible */}
      {expanded && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">#</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">ชื่อ</th>
                <th className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">เบอร์</th>
                <th className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">ไซส์</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((it, idx) => (
                <tr key={idx} className="border-t border-border/40">
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-2 py-1.5">{it.name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-2 py-1.5 text-center font-mono">
                    {it.number || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono font-semibold text-cyan-400">
                    {it.size || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">
                    {it.sponsor ? <span className="mr-1">[{it.sponsor}]</span> : ""}
                    {it.note || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!expanded && (
        <div className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
          คลิกเพื่อดูรายชื่อทั้งหมด {group.items.length} คน
        </div>
      )}
    </div>
  );
}
