"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wallet, Factory, HandCoins, ArrowDownToLine, Info, AlertTriangle, Save, Check } from "lucide-react";
import { formatBaht, formatDateTH, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { saveBankBalance, clearBankBalance } from "@/app/(admin)/reports/cash-actions";

export function WithdrawCalculator({
  cashOnHand,
  savedBalance,
  savedBalanceAt,
  receivable,
  factoryPayable,
  factoryPayableCount,
}: {
  cashOnHand: number;
  savedBalance: number | null;
  savedBalanceAt: string | null;
  receivable: number;
  factoryPayable: number;
  factoryPayableCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // prefill ด้วยยอดที่บันทึกไว้ (ถ้ามี)
  const [override, setOverride] = useState<string>(savedBalance != null ? String(savedBalance) : "");
  const base = override.trim() === "" ? (savedBalance ?? cashOnHand) : Math.max(0, Number(override) || 0);
  const isSaved = savedBalance != null;
  const dirty = override.trim() !== "" && Number(override) !== savedBalance;

  const projected = base + receivable - factoryPayable; // เมื่อเก็บเงินครบ
  const cashNow = base - factoryPayable;                 // เฉพาะเงินสดตอนนี้

  function handleSave() {
    startTransition(async () => {
      const r = await saveBankBalance({ amount: base });
      if (r.ok) { toast({ title: "บันทึกยอดเงินในบัญชีแล้ว ✓" }); router.refresh(); }
      else toast({ title: "บันทึกไม่สำเร็จ", description: r.error, variant: "destructive" });
    });
  }
  function handleClear() {
    startTransition(async () => {
      const r = await clearBankBalance();
      if (r.ok) { setOverride(""); toast({ title: "ล้างแล้ว — กลับไปใช้ค่าประมาณจากระบบ" }); router.refresh(); }
      else toast({ title: "ไม่สำเร็จ", description: r.error, variant: "destructive" });
    });
  }

  return (
    <div className="space-y-3">
      {/* ยอดเงินฐาน */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm text-muted-foreground">💵 เงินในบัญชีตอนนี้</div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{formatBaht(base)}</span>
                {isSaved ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="h-3 w-3" /> บันทึกไว้
                    {savedBalanceAt && <span className="text-muted-foreground">· {formatDateTH(savedBalanceAt, "d MMM yy HH:mm")}</span>}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">(ประมาณจากระบบ)</span>
                )}
              </div>
              {isSaved && (
                <button type="button" onClick={handleClear} disabled={isPending} className="mt-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline">
                  ล้างค่าที่บันทึก (กลับไปใช้ประมาณจากระบบ ฿{Math.round(cashOnHand).toLocaleString()})
                </button>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">พิมพ์ยอดจริงในบัญชี แล้วบันทึกไว้</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                  placeholder={String(Math.round(cashOnHand))}
                  className="h-9 w-full sm:w-36"
                />
                <Button onClick={handleSave} disabled={isPending || (isSaved && !dirty)} className="h-9 shrink-0">
                  <Save className="h-4 w-4" /> บันทึก
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waterfall — บวกเงินที่ลูกค้าจะจ่าย แล้วหักค่าผลิต */}
      <Card>
        <CardContent className="space-y-2.5 p-4 sm:p-5">
          <Row icon={Wallet} label="เงินในบัญชี" value={base} tone="text-foreground" />
          <Row
            icon={HandCoins}
            label="ลูกค้ายังค้างจ่าย (จะเก็บได้)"
            value={receivable}
            tone="text-emerald-400"
            sign="+"
            href="/reports/receivables"
          />
          <Row
            icon={Factory}
            label={`กันไว้จ่ายโรงงาน (${factoryPayableCount} งาน)`}
            value={-factoryPayable}
            tone="text-rose-400"
            sign="−"
            href="/reports/factory-payables"
          />
          <div className="border-t border-border pt-2.5">
            <div className="flex items-center justify-between rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
                <span className="font-display text-sm font-bold sm:text-base">เอาออกมาใช้ได้ (เมื่อเก็บเงินครบ)</span>
              </div>
              <span className={cn("font-display text-xl font-bold tabular-nums sm:text-2xl", projected >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {projected < 0 ? "-" : ""}{formatBaht(Math.abs(projected))}
              </span>
            </div>
          </div>

          {/* เช็คความจริงของเงินสดตอนนี้ */}
          <div className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-xs",
            cashNow >= 0 ? "border-cyan-500/25 bg-cyan-500/5" : "border-amber-500/30 bg-amber-500/5",
          )}>
            {cashNow >= 0 ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">💵 ถ้าดูเฉพาะเงินสดตอนนี้ (ยังไม่รวมที่ลูกค้าค้าง)</span>
                <span className={cn("shrink-0 font-mono font-bold", cashNow >= 0 ? "text-cyan-300" : "text-amber-300")}>
                  {cashNow < 0 ? "-" : ""}{formatBaht(Math.abs(cashNow))}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {cashNow >= 0
                  ? "เงินสดในมือพอจ่ายค่าผลิตแล้ว ส่วนที่เกินนี้ถอนได้เลย"
                  : "เงินสดตอนนี้ยังไม่พอจ่ายค่าผลิต — ต้องเก็บเงินลูกค้าเข้ามาก่อน (ยอดค้างเก็บด้านบนจะครอบคลุมส่วนนี้)"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              &quot;เอาออกได้ (เมื่อเก็บเงินครบ)&quot; = เงินในบัญชี + เงินที่ลูกค้ายังค้างจ่าย − ค่าผลิตที่ต้องจ่ายโรงงาน ·
              ถ้าลงเงินออกในระบบไม่ครบ ให้พิมพ์ยอดจริงในบัญชีด้านบน
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  tone,
  sign,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: string;
  sign?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className={cn("font-mono tabular-nums", tone)}>
        {sign && value !== 0 ? `${sign} ` : ""}{formatBaht(Math.abs(value))}
      </span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded-md px-1 py-0.5 transition hover:bg-accent/40">
        {inner}
      </Link>
    );
  }
  return <div className="px-1">{inner}</div>;
}
