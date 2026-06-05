"use client";
import { useState, useRef, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Receipt, Upload, ExternalLink, Wallet } from "lucide-react";
import { PAYMENT_TYPE_LABEL } from "@/lib/constants";
import { formatBaht, formatDateTH, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { addPayment, deletePayment, createSignedSlipUrl } from "@/app/(admin)/jobs/payment-actions";
import { createClient } from "@/lib/supabase/client";
import { PaymentRequestDialog } from "./payment-request-dialog";
import { DiscountEditor } from "./discount-editor";
import type { Payment, PaymentType } from "@/lib/types/database";

type PaymentChannel = {
  channel_type: string;
  external_id: string | null;
  display_name: string | null;
};

type PaymentShopInfo = {
  shop_name: string | null;
  phone: string | null;
  bank_info: string | null;
};

const TYPES: PaymentType[] = ["deposit", "full", "refund"];
const MAX_SLIP_SIZE = 10 * 1024 * 1024;

export function JobPayments({
  jobId,
  jobCode,
  jobLabel,
  trackToken,
  customerName,
  customerPhone,
  customerChannels,
  shopInfo,
  salePrice,
  discount,
  payments,
}: {
  jobId: string;
  jobCode: string;
  jobLabel: string | null;
  trackToken: string;
  customerName: string;
  customerPhone: string | null;
  customerChannels: PaymentChannel[];
  shopInfo: PaymentShopInfo | null;
  salePrice: number;
  discount: number;
  payments: Payment[];
}) {
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  const paid = payments.reduce((sum, p) => {
    if (p.type === "refund") return sum - Number(p.amount);
    return sum + Number(p.amount);
  }, 0);
  const netAmount = Math.max(0, Number(salePrice) - Number(discount));
  const outstanding = netAmount - paid;

  const status =
    outstanding <= 0 && paid > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";

  async function handleViewSlip(slipPath: string) {
    const result = await createSignedSlipUrl(slipPath);
    if (result.ok) window.open(result.url, "_blank");
    else toast({ title: "ไม่สามารถเปิดสลิป", description: result.error, variant: "destructive" });
  }

  function handleDelete(id: string) {
    if (!confirm("ลบรายการชำระนี้?")) return;
    startTransition(async () => {
      const result = await deletePayment(id, jobId);
      if (!result.ok) toast({ title: "ลบไม่สำเร็จ", description: result.error, variant: "destructive" });
      else toast({ title: "ลบแล้ว" });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="inline-flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" /> สรุปการเงิน
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <DiscountEditor jobId={jobId} salePrice={Number(salePrice)} currentDiscount={Number(discount)} />
            {outstanding > 0 && (
              <PaymentRequestDialog
                jobCode={jobCode}
                jobLabel={jobLabel}
                trackToken={trackToken}
                customerName={customerName}
                phone={customerPhone}
                channels={customerChannels}
                salePrice={netAmount}
                totalPaid={paid}
                shopInfo={shopInfo}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-3 ${discount > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <SummaryItem label="ราคาเต็ม" value={formatBaht(Number(salePrice))} />
            {discount > 0 && (
              <SummaryItem
                label={`ส่วนลด (${((discount / Number(salePrice)) * 100).toFixed(0)}%)`}
                value={`-${formatBaht(Number(discount))}`}
                accent="text-rose-400"
              />
            )}
            <SummaryItem
              label={discount > 0 ? "ราคาสุทธิ" : "ชำระแล้ว"}
              value={discount > 0 ? formatBaht(netAmount) : formatBaht(paid)}
              accent={discount > 0 ? "text-foreground" : "text-emerald-400"}
            />
            <SummaryItem
              label="คงเหลือ"
              value={formatBaht(outstanding)}
              accent={outstanding > 0 ? "text-amber-400" : "text-emerald-400"}
            />
          </div>
          {discount > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              ชำระแล้ว: <span className="font-semibold text-emerald-400">{formatBaht(paid)}</span>
            </div>
          )}
          <div className="mt-4">
            <PaymentStatusBadge status={status} outstanding={outstanding} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>รายการชำระ ({payments.length})</CardTitle>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> เพิ่มการชำระ
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">ยังไม่มีการชำระเงิน</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        p.type === "refund" ? "bg-red-500/20" : p.type === "deposit" ? "bg-amber-500/20" : "bg-emerald-500/20"
                      )}
                    >
                      <Receipt
                        className={cn(
                          "h-5 w-5",
                          p.type === "refund" ? "text-red-400" : p.type === "deposit" ? "text-amber-400" : "text-emerald-400"
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{PAYMENT_TYPE_LABEL[p.type]}</Badge>
                        <span className="font-semibold tabular-nums">
                          {p.type === "refund" ? "-" : ""}{formatBaht(Number(p.amount))}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTH(p.paid_at, "d MMM yy HH:mm")}
                        {p.note && ` · ${p.note}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {p.slip_path && (
                      <Button variant="ghost" size="icon" onClick={() => handleViewSlip(p.slip_path!)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddPaymentDialog
        jobId={jobId}
        outstanding={outstanding}
        open={adding}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}

function PaymentStatusBadge({
  status,
  outstanding,
}: {
  status: "paid" | "partial" | "unpaid";
  outstanding: number;
}) {
  if (status === "paid") {
    return (
      <Badge variant="success" className="text-xs">
        ✓ ชำระครบแล้ว{outstanding < 0 ? ` (เกิน ${formatBaht(-outstanding)})` : ""}
      </Badge>
    );
  }
  if (status === "partial") {
    return <Badge variant="warning" className="text-xs">⏳ ชำระบางส่วน — รอเก็บ {formatBaht(outstanding)}</Badge>;
  }
  return <Badge variant="destructive" className="text-xs">⚠ ยังไม่ชำระ</Badge>;
}

function SummaryItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-bold tabular-nums", accent)}>{value}</div>
    </div>
  );
}

function AddPaymentDialog({
  jobId,
  outstanding,
  open,
  onClose,
}: {
  jobId: string;
  outstanding: number;
  open: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<PaymentType>(outstanding > 0 ? "deposit" : "full");
  const [amount, setAmount] = useState(outstanding > 0 ? outstanding.toString() : "");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setType("deposit");
    setAmount("");
    setPaidAt(new Date().toISOString().slice(0, 16));
    setNote("");
    setSlipFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) {
      toast({ title: "กรุณาใส่จำนวนเงิน", variant: "destructive" });
      return;
    }

    let slipPath: string | null = null;

    if (slipFile) {
      if (slipFile.size > MAX_SLIP_SIZE) {
        toast({ title: "สลิปใหญ่เกิน 10MB", variant: "destructive" });
        return;
      }
      setUploading(true);
      const supabase = createClient();
      const ext = slipFile.name.split(".").pop() ?? "jpg";
      slipPath = `${jobId}/slips/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("job-files")
        .upload(slipPath, slipFile, { cacheControl: "3600", upsert: false, contentType: slipFile.type });
      setUploading(false);
      if (error) {
        toast({ title: "อัปโหลดสลิปไม่สำเร็จ", description: error.message, variant: "destructive" });
        return;
      }
    }

    startTransition(async () => {
      const result = await addPayment(jobId, {
        type,
        amount: Number(amount),
        paid_at: new Date(paidAt).toISOString(),
        slip_path: slipPath,
        note,
      });
      if (result.ok) {
        toast({ title: "บันทึกการชำระแล้ว" });
        reset();
        onClose();
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มการชำระเงิน</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>ประเภท</Label>
              <Select value={type} onValueChange={(v: PaymentType) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>จำนวนเงิน (บาท) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>วันที่/เวลาชำระ</Label>
            <Input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>แนบสลิป (เลือกไฟล์ภาพ/PDF — สูงสุด 10MB)</Label>
            <div
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground hover:border-primary/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {slipFile ? slipFile.name : "คลิกเพื่อเลือกไฟล์ (Optional)"}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="เช่น โอนผ่าน SCB, มัดจำ 50%" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>ยกเลิก</Button>
          <Button onClick={handleSubmit} disabled={isPending || uploading || !amount}>
            {uploading ? "อัปโหลดสลิป..." : isPending ? "บันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
