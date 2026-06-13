"use client";
import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, ChevronDown, ChevronUp, Package, CheckCircle2, Circle, AlertTriangle, Loader2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toggleItemProduced, markGroupProduced, postFactoryMessage } from "./actions";
import { sortSizes } from "@/lib/constants";

export type RosterItem = {
  id: string;
  name: string | null;
  number: string | null;
  size: string | null;
  sponsor: string | null;
  item_type: string | null;
  quantity: number | null;
  note: string | null;
  produced: boolean;
  produced_at: string | null;
};

function iconForType(t: string): { emoji: string; color: string } {
  const lower = t.toLowerCase();
  const hasShirt = t.includes("เสื้อ") || lower.includes("shirt") || lower.includes("jersey");
  const hasPants = t.includes("กางเกง") || lower.includes("pants");
  const isLongSleeve = t.includes("แขนยาว") || lower.includes("long sleeve") || lower.includes("long-sleeve");
  const isShortSleeve = t.includes("แขนสั้น") || lower.includes("short sleeve") || lower.includes("short-sleeve");

  // Combined shirt+pants set
  if ((hasShirt && hasPants) || t.includes("ชุด") || t.includes("เซ็ต") || lower.includes("set")) {
    if (isLongSleeve) return { emoji: "🥋", color: "text-indigo-400" };
    return { emoji: "🩳", color: "text-orange-400" };
  }
  if (t.includes("ถุงเท้า") || lower.includes("sock")) {
    return { emoji: "🧦", color: "text-purple-400" };
  }
  if (t.includes("ปลอกแขน")) {
    return { emoji: "💪", color: "text-pink-400" };
  }
  if (hasPants) {
    return { emoji: "👖", color: "text-blue-400" };
  }
  // Shirts (any sleeve variant)
  if (isLongSleeve) {
    return { emoji: "🥼", color: "text-teal-400" };
  }
  if (isShortSleeve) {
    return { emoji: "👕", color: "text-cyan-400" };
  }
  if (hasShirt) {
    return { emoji: "👕", color: "text-cyan-400" };
  }
  return { emoji: "📦", color: "text-muted-foreground" };
}

type Group = {
  type: string;
  items: RosterItem[];
  sizeSummary: { size: string; count: number }[];
  totalQty: number;
  producedQty: number;
};

export function FactoryPortalRoster({ token, items: initialItems }: { token: string; items: RosterItem[] }) {
  const [items, setItems] = useState<RosterItem[]>(initialItems);

  const totalQty = items.reduce((s, it) => s + (it.quantity ?? 1), 0);
  const producedQty = items
    .filter((it) => it.produced)
    .reduce((s, it) => s + (it.quantity ?? 1), 0);

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
        let groupTotal = 0;
        let groupProduced = 0;
        for (const it of list) {
          const s = (it.size ?? "").trim().toUpperCase() || "ไม่ระบุ";
          const qty = it.quantity ?? 1;
          sizeCounts.set(s, (sizeCounts.get(s) ?? 0) + qty);
          groupTotal += qty;
          if (it.produced) groupProduced += qty;
        }
        return {
          type,
          items: list,
          sizeSummary: sortSizes(Array.from(sizeCounts.keys())).map((s) => ({
            size: s,
            count: sizeCounts.get(s) ?? 0,
          })),
          totalQty: groupTotal,
          producedQty: groupProduced,
        };
      })
      .sort((a, b) => b.items.length - a.items.length);
  }, [items]);

  function updateItem(itemId: string, patch: Partial<RosterItem>) {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
  }

  function updateGroup(typeKey: string, produced: boolean) {
    setItems((prev) =>
      prev.map((it) =>
        ((it.item_type ?? "").trim() || "ไม่ระบุประเภท") === typeKey
          ? { ...it, produced, produced_at: produced ? new Date().toISOString() : null }
          : it,
      ),
    );
  }

  if (items.length === 0) return null;

  const overallPct = totalQty > 0 ? Math.round((producedQty / totalQty) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="inline-flex flex-wrap items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-cyan-400" /> เช็คลิสต์การผลิต — แยกตามสินค้า
          <Badge variant="outline" className="ml-1 text-xs">
            {producedQty}/{totalQty} ตัว
          </Badge>
        </CardTitle>
        {/* Overall progress */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ความคืบหน้ารวม</span>
            <span className={cn("font-mono font-bold", overallPct === 100 ? "text-emerald-400" : "text-cyan-400")}>
              {overallPct}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full transition-all", overallPct === 100 ? "bg-emerald-400" : "bg-cyan-400")}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((g) => (
          <RosterGroupCard
            key={g.type}
            token={token}
            group={g}
            onToggleItem={(itemId, produced) => updateItem(itemId, { produced, produced_at: produced ? new Date().toISOString() : null })}
            onBulkUpdate={(produced) => updateGroup(g.type, produced)}
          />
        ))}
        <p className="text-center text-[11px] text-muted-foreground">
          💡 ติ๊ก ✓ เมื่อผลิตแต่ละชิ้นเสร็จ — ร้านจะเห็น progress ทันที
        </p>
      </CardContent>
    </Card>
  );
}

function RosterGroupCard({
  token,
  group,
  onToggleItem,
  onBulkUpdate,
}: {
  token: string;
  group: Group;
  onToggleItem: (itemId: string, produced: boolean) => void;
  onBulkUpdate: (produced: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(group.items.length <= 15);
  const [issueText, setIssueText] = useState("");
  const [showIssueBox, setShowIssueBox] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { emoji, color } = iconForType(group.type);

  const groupPct = group.totalQty > 0 ? Math.round((group.producedQty / group.totalQty) * 100) : 0;
  const allDone = group.producedQty === group.totalQty;

  function handleToggle(itemId: string, currentProduced: boolean) {
    const next = !currentProduced;
    onToggleItem(itemId, next); // optimistic
    startTransition(async () => {
      const res = await toggleItemProduced(token, itemId, next);
      if (!res.ok) {
        onToggleItem(itemId, currentProduced); // rollback
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleBulkToggle(produced: boolean) {
    const label = produced ? "ติ๊กทั้งหมด" : "ล้างทั้งหมด";
    if (!confirm(`${label} ของกลุ่ม "${group.type}" (${group.items.length} รายการ)?`)) return;
    onBulkUpdate(produced); // optimistic
    startTransition(async () => {
      const res = await markGroupProduced(token, group.type, produced);
      if (res.ok) {
        toast({ title: `${label}แล้ว (${res.count} รายการ) ✅` });
      } else {
        onBulkUpdate(!produced); // rollback
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleSendIssue() {
    const text = issueText.trim();
    if (!text) {
      toast({ title: "กรุณาใส่ข้อความปัญหา", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const res = await postFactoryMessage(token, "issue", `[${group.type}] ${text}`);
      if (res.ok) {
        toast({ title: "แจ้งปัญหาให้ร้านแล้ว ✅" });
        setIssueText("");
        setShowIssueBox(false);
      } else {
        toast({ title: "ส่งไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/40">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 transition hover:bg-accent/40"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className={cn("font-semibold", color)}>{group.type}</span>
          <Badge className={cn(allDone ? "bg-emerald-500/30 text-emerald-200" : "bg-orange-500/20 text-orange-300")}>
            {group.producedQty}/{group.totalQty} ตัว
          </Badge>
          {allDone && <Badge className="bg-emerald-500/30 text-emerald-100">✓ ครบแล้ว</Badge>}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Progress bar */}
      <div className="border-t border-border bg-muted/20 px-3 py-2">
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", allDone ? "bg-emerald-400" : "bg-cyan-400")}
            style={{ width: `${groupPct}%` }}
          />
        </div>
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

      {expanded && (
        <>
          {/* Roster table with checkboxes */}
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="w-10 px-2 py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">✓</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">#</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">ชื่อ</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">เบอร์</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">ไซส์</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">จำนวน</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((it, idx) => {
                  const qty = it.quantity ?? 1;
                  return (
                    <tr
                      key={it.id}
                      className={cn(
                        "border-t border-border/40 transition",
                        it.produced && "bg-emerald-500/5",
                      )}
                    >
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(it.id, it.produced)}
                          disabled={isPending}
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-md border-2 transition",
                            it.produced
                              ? "border-emerald-400 bg-emerald-500/30 text-emerald-300"
                              : "border-border bg-card/60 text-muted-foreground hover:border-cyan-400 hover:text-cyan-400",
                          )}
                          aria-label={it.produced ? "ยกเลิกการติ๊ก" : "ติ๊กว่าผลิตแล้ว"}
                        >
                          {it.produced ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className={cn("px-2 py-1.5", it.produced && "text-muted-foreground line-through")}>
                        {it.name || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={cn("px-2 py-1.5 text-center font-mono", it.produced && "text-muted-foreground line-through")}>
                        {it.number || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={cn("px-2 py-1.5 text-center font-mono font-semibold", it.produced ? "text-emerald-400" : "text-cyan-400")}>
                        {it.size || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono">
                        {qty > 1 ? <span className="font-bold text-orange-400">×{qty}</span> : qty}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">
                        {it.sponsor ? <span className="mr-1">[{it.sponsor}]</span> : ""}
                        {it.note || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bulk actions + report issue */}
          <div className="space-y-2 border-t border-border bg-muted/10 p-3">
            <div className="flex flex-wrap gap-2">
              {!allDone ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkToggle(true)}
                  disabled={isPending}
                  className="flex-1 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> ติ๊กทั้งกลุ่มเป็นเสร็จ
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkToggle(false)}
                  disabled={isPending}
                  className="flex-1"
                >
                  <Circle className="h-3.5 w-3.5" /> ล้างเครื่องหมายทั้งกลุ่ม
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowIssueBox((v) => !v)}
                disabled={isPending}
                className="flex-1 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> แจ้งปัญหากลุ่มนี้
              </Button>
            </div>

            {showIssueBox && (
              <div className="space-y-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
                <Textarea
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  rows={2}
                  placeholder={`เช่น "ขาดเบอร์ 5 ไซส์ L" หรือ "ผ้าหมด พรุ่งนี้ทำต่อ"`}
                  className="text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIssueText("");
                      setShowIssueBox(false);
                    }}
                    disabled={isPending}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendIssue}
                    disabled={isPending || !issueText.trim()}
                    className="bg-rose-500/80 hover:bg-rose-500"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    แจ้งร้านทันที
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!expanded && (
        <div className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
          คลิกเพื่อดูรายชื่อ + ติ๊กเช็คลิสต์
        </div>
      )}
    </div>
  );
}
