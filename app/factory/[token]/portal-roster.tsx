"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronDown, ChevronUp } from "lucide-react";

export type RosterItem = {
  name: string | null;
  number: string | null;
  size: string | null;
  sponsor: string | null;
  item_type: string | null;
  note: string | null;
};

export function FactoryPortalRoster({ items }: { items: RosterItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const visibleItems = expanded ? items : items.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-cyan-400" /> รายชื่อ / เบอร์ / ไซส์
          <Badge variant="outline" className="ml-1 text-xs">{items.length} คน</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">#</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">ประเภท</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">ชื่อ</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground">เบอร์</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground">ไซส์</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((it, idx) => (
                <tr key={idx} className="border-t border-border/50">
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    {it.item_type ? <Badge variant="outline" className="text-[10px]">{it.item_type}</Badge> : "—"}
                  </td>
                  <td className="px-2 py-1.5">{it.name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-2 py-1.5 text-center font-mono">{it.number || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-2 py-1.5 text-center font-mono font-semibold text-cyan-400">{it.size || "—"}</td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{it.note || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length > 5 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 w-full"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> ยุบ
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> ดูทั้งหมด ({items.length} คน)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
