"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, TrendingDown } from "lucide-react";
import { formatBaht, formatDateTH } from "@/lib/utils";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, EXPENSE_CATEGORY_EMOJI } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { addExpense, deleteExpense } from "@/app/(admin)/reports/finance/expense-actions";
import type { Expense, ExpenseCategory } from "@/lib/types/database";

export function ExpenseManager({ recent }: { recent: Expense[] }) {
  const [category, setCategory] = useState<ExpenseCategory>("factory");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!amount || Number(amount) <= 0) {
      toast({ title: "กรุณาใส่จำนวนเงิน", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const res = await addExpense({
        category,
        amount: Number(amount),
        paid_at: new Date(paidAt).toISOString(),
        note: note || null,
      });
      if (res.ok) {
        toast({ title: "บันทึกรายจ่ายแล้ว ✅" });
        setAmount("");
        setNote("");
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (!res.ok) toast({ title: "ลบไม่สำเร็จ", description: res.error, variant: "destructive" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <TrendingDown className="h-5 w-5 text-rose-400" /> บันทึกเงินออก (ค่าใช้จ่าย)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">หมวด</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">จำนวนเงิน (฿)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">วันที่จ่าย</Label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="หมายเหตุ เช่น จ่ายโรงงาน Alwayswynn งวด 1, ค่าผ้า..."
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            บันทึก
          </Button>
        </div>

        {/* Recent list */}
        {recent.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="text-xs font-semibold text-muted-foreground">รายการล่าสุด ({recent.length})</div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {recent.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 p-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-lg">{EXPENSE_CATEGORY_EMOJI[e.category]}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{EXPENSE_CATEGORY_LABEL[e.category]}</Badge>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {formatDateTH(e.paid_at, "d MMM yy")}
                        {e.note && ` · ${e.note}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="font-mono font-semibold text-rose-400">-{formatBaht(Number(e.amount))}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} disabled={isPending}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
