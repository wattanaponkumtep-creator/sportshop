"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";
import { formatBaht } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { saveLineItems, updateExtraCosts } from "@/app/(admin)/jobs/line-items-actions";
import type { JobLineItem } from "@/lib/types/database";

type Row = {
  product_type: string;
  collar_type: string;
  description: string;
  quantity: number;
  unit_sale_price: number;
  unit_cost: number;
  factory_id: string;
};

const PRODUCT_TYPES = ["เสื้อบอล", "เสื้อโปโล", "เสื้อแขนยาว", "เสื้อแขนกุด", "กางเกง", "ถุงเท้า", "ปลอกแขน", "อื่น ๆ"];
const COLLAR_TYPES = ["คอกลม", "คอปก", "คอวี", "ฮู้ด", "ไม่ระบุ"];

function emptyRow(): Row {
  return {
    product_type: "เสื้อบอล",
    collar_type: "คอกลม",
    description: "",
    quantity: 1,
    unit_sale_price: 0,
    unit_cost: 0,
    factory_id: "",
  };
}

export function LineItemsEditor({
  jobId,
  initialItems,
  shippingCost,
  otherCost,
  factories,
}: {
  jobId: string;
  initialItems: JobLineItem[];
  shippingCost: number;
  otherCost: number;
  factories: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((it) => ({
          product_type: it.product_type ?? "",
          collar_type: it.collar_type ?? "",
          description: it.description ?? "",
          quantity: it.quantity,
          unit_sale_price: Number(it.unit_sale_price),
          unit_cost: Number(it.unit_cost),
          factory_id: it.factory_id ?? "",
        }))
      : []
  );
  const [shipping, setShipping] = useState(shippingCost);
  const [other, setOther] = useState(otherCost);
  const [isPending, startTransition] = useTransition();

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }
  function updateRow(idx: number, key: keyof Row, value: string | number) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  }

  const totals = rows.reduce(
    (acc, r) => ({
      qty: acc.qty + r.quantity,
      revenue: acc.revenue + r.quantity * r.unit_sale_price,
      cost: acc.cost + r.quantity * r.unit_cost,
    }),
    { qty: 0, revenue: 0, cost: 0 }
  );
  const totalCost = totals.cost + shipping + other;
  const profit = totals.revenue - totalCost;
  const margin = totals.revenue > 0 ? (profit / totals.revenue) * 100 : 0;

  function handleSave() {
    startTransition(async () => {
      const result = await saveLineItems(
        jobId,
        rows.map((r) => ({
          product_type: r.product_type || null,
          collar_type: r.collar_type || null,
          description: r.description || null,
          quantity: r.quantity,
          unit_sale_price: r.unit_sale_price,
          unit_cost: r.unit_cost,
          factory_id: r.factory_id || null,
        }))
      );
      if (!result.ok) {
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
        return;
      }
      await updateExtraCosts(jobId, { shipping_cost: shipping, other_cost: other });
      toast({ title: "บันทึก line items แล้ว" });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="inline-flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-400" /> รายการสินค้า (Line Items)
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" /> เพิ่มแถว
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? "บันทึก..." : "บันทึก"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการ — กด &quot;เพิ่มแถว&quot; เพื่อเริ่มกรอกสินค้า
            </p>
          ) : (
            rows.map((row, idx) => (
              <div key={idx} className="space-y-3 rounded-md border border-border bg-card/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">รายการที่ {idx + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">ประเภทเสื้อ</Label>
                    <Select value={row.product_type} onValueChange={(v) => updateRow(idx, "product_type", v)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="เลือก" /></SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">แบบคอ</Label>
                    <Select value={row.collar_type} onValueChange={(v) => updateRow(idx, "collar_type", v)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="เลือก" /></SelectTrigger>
                      <SelectContent>
                        {COLLAR_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">รายละเอียดเพิ่ม</Label>
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(idx, "description", e.target.value)}
                    placeholder="เช่น พิมพ์ซับลิเมชั่น เนื้อ Cool Tech"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">จำนวน</Label>
                    <Input
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, "quantity", Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ราคา/ตัว (บาท)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unit_sale_price}
                      onChange={(e) => updateRow(idx, "unit_sale_price", Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ต้นทุน/ตัว (บาท)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unit_cost}
                      onChange={(e) => updateRow(idx, "unit_cost", Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">โรงงาน</Label>
                    <Select value={row.factory_id || "_none"} onValueChange={(v) => updateRow(idx, "factory_id", v === "_none" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— ไม่ระบุ —</SelectItem>
                        {factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between border-t border-border pt-2 text-xs">
                  <span className="text-muted-foreground">รวมรายการนี้:</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatBaht(row.quantity * row.unit_sale_price)}
                    {row.unit_cost > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        (กำไร {formatBaht(row.quantity * (row.unit_sale_price - row.unit_cost))})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ค่าใช้จ่ายเพิ่มเติม</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">ค่าส่ง (บาท)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={shipping}
              onChange={(e) => setShipping(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ค่าอื่น ๆ (บาท)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={other}
              onChange={(e) => setOther(Number(e.target.value))}
              placeholder="เช่น ค่าออกแบบเพิ่ม, ค่าด่วน"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="grid gap-2 p-4 sm:grid-cols-5">
          <SumCell label="จำนวน" value={`${totals.qty}`} />
          <SumCell label="ยอดขาย" value={formatBaht(totals.revenue)} accent="text-blue-400" />
          <SumCell label="ต้นทุนรวม" value={formatBaht(totalCost)} accent="text-amber-400" />
          <SumCell label="กำไร" value={formatBaht(profit)} accent={profit >= 0 ? "text-emerald-400" : "text-red-400"} />
          <SumCell label="Margin" value={`${margin.toFixed(1)}%`} accent={margin >= 30 ? "text-emerald-400" : margin >= 15 ? "text-amber-400" : "text-red-400"} />
        </CardContent>
      </Card>
    </div>
  );
}

function SumCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-bold tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
