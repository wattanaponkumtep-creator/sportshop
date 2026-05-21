"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { saveJobItems } from "@/app/(admin)/jobs/actions";
import type { JobItem } from "@/lib/types/database";

type Row = { name: string; number: string; size: string; sponsor: string; note: string };

export function JobItemsEditor({ jobId, initialItems }: { jobId: string; initialItems: JobItem[] }) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((it) => ({
          name: it.name ?? "",
          number: it.number ?? "",
          size: it.size ?? "",
          sponsor: it.sponsor ?? "",
          note: it.note ?? "",
        }))
      : []
  );
  const [isPending, startTransition] = useTransition();

  function addRow() { setRows((r) => [...r, { name: "", number: "", size: "", sponsor: "", note: "" }]); }
  function removeRow(idx: number) { setRows((r) => r.filter((_, i) => i !== idx)); }
  function updateRow(idx: number, key: keyof Row, value: string) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveJobItems(jobId, rows);
      if (result.ok) toast({ title: "บันทึกตารางไซส์แล้ว" });
      else toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>รายชื่อ / เบอร์ / ไซส์</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4" /> เพิ่มแถว</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>{isPending ? "บันทึก..." : "บันทึก"}</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">ยังไม่มีรายชื่อ — กด "เพิ่มแถว" เพื่อใส่ตารางไซส์</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead className="w-20">เบอร์</TableHead>
                <TableHead className="w-24">ไซส์</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>หมายเหตุ</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-center text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                  <TableCell><Input value={row.name} onChange={(e) => updateRow(idx, "name", e.target.value)} /></TableCell>
                  <TableCell><Input value={row.number} onChange={(e) => updateRow(idx, "number", e.target.value)} /></TableCell>
                  <TableCell><Input value={row.size} onChange={(e) => updateRow(idx, "size", e.target.value)} /></TableCell>
                  <TableCell><Input value={row.sponsor} onChange={(e) => updateRow(idx, "sponsor", e.target.value)} /></TableCell>
                  <TableCell><Input value={row.note} onChange={(e) => updateRow(idx, "note", e.target.value)} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
