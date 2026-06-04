"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { saveJobItems } from "@/app/(admin)/jobs/actions";
import { ITEM_TYPE_PRESETS } from "@/lib/constants";
import type { JobItem } from "@/lib/types/database";

type Row = {
  name: string;
  number: string;
  size: string;
  quantity: number;
  item_type: string;
};

const NEW_ROW: Row = { name: "", number: "", size: "", quantity: 1, item_type: "" };

export function JobItemsEditor({ jobId, initialItems }: { jobId: string; initialItems: JobItem[] }) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((it) => ({
          name: it.name ?? "",
          number: it.number ?? "",
          size: it.size ?? "",
          quantity: it.quantity ?? 1,
          item_type: it.item_type ?? "",
        }))
      : [],
  );
  const [isPending, startTransition] = useTransition();

  function addRow() {
    setRows((r) => [...r, { ...NEW_ROW }]);
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }
  function updateRow<K extends keyof Row>(idx: number, key: K, value: Row[K]) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveJobItems(jobId, rows);
      if (result.ok) toast({ title: "บันทึกตารางไซส์แล้ว ✅" });
      else toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  const totalUnits = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>รายชื่อ / เบอร์ / ไซส์</CardTitle>
          {rows.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {rows.length} แถว • รวม <strong className="text-orange-400">{totalUnits}</strong> ตัว
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" /> เพิ่มแถว
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "บันทึก..." : "บันทึก"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">
            ยังไม่มีรายชื่อ — กด &quot;เพิ่มแถว&quot; เพื่อใส่ตารางไซส์
          </p>
        ) : (
          <div className="overflow-x-auto">
            {/* Shared datalist for item_type autocomplete */}
            <datalist id="item-type-presets">
              {ITEM_TYPE_PRESETS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="min-w-[140px]">ชื่อ</TableHead>
                  <TableHead className="w-20">เบอร์</TableHead>
                  <TableHead className="w-20">ไซส์</TableHead>
                  <TableHead className="w-20 text-center">จำนวน</TableHead>
                  <TableHead className="min-w-[180px]">ประเภท</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(idx, "name", e.target.value)}
                        placeholder="(ไม่มี)"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.number}
                        onChange={(e) => updateRow(idx, "number", e.target.value)}
                        className="text-center font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.size}
                        onChange={(e) => updateRow(idx, "size", e.target.value.toUpperCase())}
                        className="text-center font-mono uppercase"
                        placeholder="M"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => updateRow(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-center font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        list="item-type-presets"
                        value={row.item_type}
                        onChange={(e) => updateRow(idx, "item_type", e.target.value)}
                        placeholder="เลือก/พิมพ์เอง..."
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
