"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Loader2, X, ArrowRight, ClipboardPaste, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { saveJobItems } from "@/app/(admin)/jobs/actions";

type Row = {
  name: string;
  number: string;
  size: string;
  item_type: string;
  note: string;
};

const EXAMPLE_TEXT = `เป็นชุด
M    6
M    25
L    5
L    8
XL   12
2XL  3

เฉพาะเสื้อ
M    10
L    77
XL   55`;

export function PasteRosterText({ jobId, onImported }: { jobId: string; onImported?: () => void }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleAnalyze() {
    if (!text.trim()) {
      toast({ title: "กรุณาวางข้อความก่อน", variant: "destructive" });
      return;
    }
    setLoading(true);
    setRows(null);
    try {
      const res = await fetch("/api/parse-roster-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as { ok: boolean; rows?: Row[]; error?: string };
      if (!data.ok) {
        toast({ title: "AI อ่านไม่สำเร็จ", description: data.error, variant: "destructive" });
      } else {
        setRows(data.rows ?? []);
        toast({ title: `AI อ่านได้ ${data.rows?.length ?? 0} แถว` });
      }
    } catch (err) {
      toast({
        title: "Network error",
        description: err instanceof Error ? err.message : "เชื่อมต่อไม่ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePaste() {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
        toast({ title: "วางข้อความจาก clipboard แล้ว" });
      }
    } catch {
      toast({ title: "อ่าน clipboard ไม่ได้ — ใช้ Ctrl+V แทน", variant: "destructive" });
    }
  }

  function updateRow(idx: number, key: keyof Row, value: string) {
    if (!rows) return;
    setRows(rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function removeRow(idx: number) {
    if (!rows) return;
    setRows(rows.filter((_, i) => i !== idx));
  }

  function handleImport() {
    if (!rows || rows.length === 0) return;
    startTransition(async () => {
      const items = rows.map((r) => ({
        name: r.name || null,
        number: r.number || null,
        size: r.size || null,
        sponsor: null,
        note: r.note || null,
        item_type: r.item_type || null,
      }));
      const result = await saveJobItems(jobId, items);
      if (result.ok) {
        toast({ title: `นำเข้า ${rows.length} รายการแล้ว ✅` });
        setText("");
        setRows(null);
        onImported?.();
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  // Group preview by item_type for summary
  const grouped = rows
    ? rows.reduce<Record<string, Record<string, number>>>((acc, r) => {
        const t = r.item_type || "ไม่ระบุ";
        if (!acc[t]) acc[t] = {};
        const s = r.size || "ไม่ระบุ";
        acc[t][s] = (acc[t][s] ?? 0) + 1;
        return acc;
      }, {})
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-400" /> วางข้อความให้ AI อ่าน
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rows && !loading && (
          <>
            <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-3 text-xs text-muted-foreground">
              💡 วางรายชื่อ/เบอร์/ไซส์ จากที่ลูกค้าส่งมา (LINE, Excel, Email) — AI จะแยกประเภทให้
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">ข้อความ</Label>
                <Button variant="ghost" size="sm" onClick={handlePaste} className="h-7 text-xs">
                  <ClipboardPaste className="h-3 w-3" /> วางจาก Clipboard
                </Button>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                placeholder={EXAMPLE_TEXT}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{text.length} ตัวอักษร</span>
                <button type="button" onClick={() => setText(EXAMPLE_TEXT)} className="hover:text-foreground">
                  ใส่ตัวอย่าง
                </button>
              </div>
            </div>

            <Button onClick={handleAnalyze} disabled={!text.trim()} className="w-full">
              <Sparkles className="h-4 w-4" /> ให้ AI อ่าน + แยกประเภท
            </Button>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-medium">AI กำลังประมวลผล...</div>
            <div className="text-xs text-muted-foreground">5-15 วินาที</div>
          </div>
        )}

        {rows && !loading && (
          <div className="space-y-3">
            {/* Summary by type/size */}
            {grouped && Object.keys(grouped).length > 0 && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold">AI อ่านได้ {rows.length} รายการ — สรุปตามประเภท</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(grouped).map(([itemType, sizes]) => {
                    const total = Object.values(sizes).reduce((a, b) => a + b, 0);
                    return (
                      <div key={itemType} className="rounded-md border border-border bg-card/40 p-2.5">
                        <div className="mb-1.5 flex items-center justify-between">
                          <Badge className="bg-primary text-primary-foreground">{itemType}</Badge>
                          <span className="text-xs font-bold">รวม {total} ชิ้น</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(sizes)
                            .sort()
                            .map(([size, count]) => (
                              <Badge key={size} variant="outline" className="font-mono text-[10px]">
                                {size}: <strong className="ml-1">{count}</strong>
                              </Badge>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="max-h-[400px] overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="w-16">เบอร์</TableHead>
                    <TableHead className="w-16">ไซส์</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <input
                          value={r.item_type}
                          onChange={(e) => updateRow(idx, "item_type", e.target.value)}
                          className="w-full bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={r.name}
                          onChange={(e) => updateRow(idx, "name", e.target.value)}
                          className="w-full bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="(ไม่มี)"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={r.number}
                          onChange={(e) => updateRow(idx, "number", e.target.value)}
                          className="w-full bg-transparent text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={r.size}
                          onChange={(e) => updateRow(idx, "size", e.target.value)}
                          className="w-full bg-transparent text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={r.note}
                          onChange={(e) => updateRow(idx, "note", e.target.value)}
                          className="w-full bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <strong className="text-amber-400">⚠️ คำเตือน:</strong> นำเข้าจะ <strong>ล้างรายการเดิมใน JOB</strong> ทั้งหมด
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setRows(null); setText(""); }}
                disabled={isPending}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleImport} disabled={isPending || rows.length === 0}>
                {isPending ? "นำเข้า..." : `นำเข้า ${rows.length} รายการ`}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
