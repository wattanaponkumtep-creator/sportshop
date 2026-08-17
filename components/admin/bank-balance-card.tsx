"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Save, RefreshCw, Factory, ArrowDownToLine, ArrowRight } from "lucide-react";
import { formatBaht, formatDateTH, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { saveBankBalance } from "@/app/(admin)/reports/cash-actions";

export function BankBalanceCard({
  effectiveCash,
  cashOnHand,
  savedBalance,
  savedBalanceAt,
  deltaIn,
  deltaOut,
  factoryPayable,
  projectedAfterCollect,
}: {
  effectiveCash: number;
  cashOnHand: number;
  savedBalance: number | null;
  savedBalanceAt: string | null;
  deltaIn: number;
  deltaOut: number;
  factoryPayable: number;
  projectedAfterCollect: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>("");

  const isAnchored = savedBalance != null;

  function handleSave() {
    const amount = Math.max(0, Number(value) || 0);
    startTransition(async () => {
      const r = await saveBankBalance({ amount });
      if (r.ok) {
        toast({ title: "ตั้งยอดเงินตั้งต้นแล้ว ✓ ระบบจะบวก-ลบตามเงินเข้า-ออกให้เอง" });
        setEditing(false);
        router.refresh();
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: r.error, variant: "destructive" });
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* ยอดเงินสด */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> เงินในบัญชีตอนนี้
              {isAnchored ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-400">
                  <RefreshCw className="h-3 w-3" /> อัปเดตอัตโนมัติ
                </span>
              ) : (
                <span>(ประมาณ)</span>
              )}
            </div>

            {editing ? (
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={String(Math.round(effectiveCash))}
                  className="h-9 w-36"
                />
                <Button size="sm" onClick={handleSave} disabled={isPending} className="h-9">
                  <Save className="h-4 w-4" /> ตั้งยอด
                </Button>
                <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
                  ยกเลิก
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setValue(String(Math.round(effectiveCash))); setEditing(true); }}
                  className="mt-0.5 flex items-baseline gap-2 text-left"
                >
                  <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{formatBaht(effectiveCash)}</span>
                  <span className="text-xs text-primary underline-offset-2 hover:underline">ตั้งยอดจริง</span>
                </button>
                {isAnchored && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    ตั้งไว้ {formatBaht(savedBalance!)} {savedBalanceAt && `(${formatDateTH(savedBalanceAt, "d MMM")})`}
                    {deltaIn > 0 && <span className="text-emerald-400"> · +เข้า {formatBaht(deltaIn)}</span>}
                    {deltaOut > 0 && <span className="text-rose-400"> · −ออก {formatBaht(deltaOut)}</span>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick context */}
          <Link href="/reports/finance" className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2 transition hover:border-primary/40">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                <Factory className="h-3 w-3 text-amber-400" /> ต้องจ่ายโรงงาน
              </div>
              <div className="font-mono text-sm font-bold tabular-nums text-amber-400">{formatBaht(factoryPayable)}</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                <ArrowDownToLine className="h-3 w-3 text-emerald-400" /> เอาออกได้
              </div>
              <div className={cn("font-mono text-sm font-bold tabular-nums", projectedAfterCollect >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {projectedAfterCollect < 0 ? "-" : ""}{formatBaht(Math.abs(projectedAfterCollect))}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
