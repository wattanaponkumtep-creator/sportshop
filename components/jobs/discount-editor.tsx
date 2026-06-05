"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tag, Loader2, Save, X } from "lucide-react";
import { formatBaht, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { updateJobDiscount } from "@/app/(admin)/jobs/payment-actions";

type Props = {
  jobId: string;
  salePrice: number;
  currentDiscount: number;
};

export function DiscountEditor({ jobId, salePrice, currentDiscount }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"baht" | "percent">("baht");
  const [bahtValue, setBahtValue] = useState(currentDiscount.toString());
  const [percentValue, setPercentValue] = useState(
    salePrice > 0 ? ((currentDiscount / salePrice) * 100).toFixed(1) : "0",
  );
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const computedDiscount =
    mode === "baht"
      ? Math.max(0, Math.min(salePrice, Number(bahtValue) || 0))
      : Math.max(0, Math.min(salePrice, (salePrice * (Number(percentValue) || 0)) / 100));

  const netAmount = Math.max(0, salePrice - computedDiscount);
  const pctOff = salePrice > 0 ? ((computedDiscount / salePrice) * 100).toFixed(1) : "0";

  function handleSave() {
    startTransition(async () => {
      const res = await updateJobDiscount(jobId, computedDiscount, note || null);
      if (res.ok) {
        toast({ title: computedDiscount > 0 ? `บันทึกส่วนลด ${formatBaht(computedDiscount)} แล้ว ✅` : "ลบส่วนลดแล้ว" });
        setOpen(false);
        setNote("");
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function quickPercent(p: number) {
    setMode("percent");
    setPercentValue(p.toString());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          currentDiscount > 0
            ? "border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
            : "border-border text-muted-foreground",
        )}
      >
        <Tag className="h-3.5 w-3.5" />
        {currentDiscount > 0 ? `ส่วนลด: ${formatBaht(currentDiscount)}` : "เพิ่มส่วนลด"}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Tag className="h-5 w-5 text-rose-400" /> ตั้งส่วนลด
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/30 p-3 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground">ราคาเต็ม</div>
              <div className="font-mono text-sm font-bold">{formatBaht(salePrice)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">ส่วนลด</div>
              <div className="font-mono text-sm font-bold text-rose-400">
                -{formatBaht(computedDiscount)}
              </div>
              {computedDiscount > 0 && (
                <div className="text-[10px] text-rose-300">{pctOff}%</div>
              )}
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">ราคาสุทธิ</div>
              <div className="font-mono text-sm font-bold text-emerald-400">
                {formatBaht(netAmount)}
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("baht")}
              className={cn(
                "rounded-md border-2 px-3 py-2 text-sm transition",
                mode === "baht"
                  ? "border-primary bg-primary/15 font-semibold"
                  : "border-border bg-card/40 text-muted-foreground hover:border-primary/40",
              )}
            >
              💵 ระบุเป็นบาท
            </button>
            <button
              type="button"
              onClick={() => setMode("percent")}
              className={cn(
                "rounded-md border-2 px-3 py-2 text-sm transition",
                mode === "percent"
                  ? "border-primary bg-primary/15 font-semibold"
                  : "border-border bg-card/40 text-muted-foreground hover:border-primary/40",
              )}
            >
              % ระบุเป็นเปอร์เซ็นต์
            </button>
          </div>

          {/* Input */}
          {mode === "baht" ? (
            <div className="space-y-1.5">
              <Label htmlFor="discount-baht" className="text-xs">ส่วนลด (บาท)</Label>
              <Input
                id="discount-baht"
                type="number"
                min="0"
                max={salePrice}
                step="0.01"
                value={bahtValue}
                onChange={(e) => setBahtValue(e.target.value)}
                placeholder="0.00"
                className="font-mono text-lg"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="discount-pct" className="text-xs">ส่วนลด (%)</Label>
              <Input
                id="discount-pct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
                placeholder="0"
                className="font-mono text-lg"
              />
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 25, 30, 50].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => quickPercent(p)}
                    className="rounded border border-border bg-card/40 px-2 py-0.5 text-xs hover:border-primary/40 hover:bg-primary/10"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="discount-note" className="text-xs">หมายเหตุ (Optional)</Label>
            <Input
              id="discount-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ลูกค้าประจำ, ส่วนลดจัดโปรเดือนนี้"
            />
          </div>

          {/* Remove button */}
          {currentDiscount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setBahtValue("0");
                setPercentValue("0");
              }}
              className="w-full text-rose-300 hover:bg-rose-500/10"
            >
              <X className="h-3.5 w-3.5" /> ลบส่วนลดทั้งหมด
            </Button>
          )}

          {/* Inline notice */}
          {computedDiscount > 0 && (
            <div className="rounded border border-rose-500/30 bg-rose-500/5 p-2.5 text-xs text-rose-200">
              💡 ลูกค้าจะจ่ายแค่ <strong>{formatBaht(netAmount)}</strong> แทนที่จะเป็น{" "}
              <strong>{formatBaht(salePrice)}</strong>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isPending ? "บันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
