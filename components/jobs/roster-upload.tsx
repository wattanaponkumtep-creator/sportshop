"use client";
import { useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, X, ArrowRight, Sparkles, FileText, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { parseRosterFile, type ParseResult, type ParsedRow } from "@/lib/parser/roster-excel";
import { saveJobItems } from "@/app/(admin)/jobs/actions";
import { ITEM_TYPE_PRESETS } from "@/lib/constants";

function ItemTypeSummary({ rows }: { rows: ParsedRow[] }) {
  const summary = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const t = r.item_type?.trim() || "ไม่ระบุประเภท";
    const qty = r.quantity ?? 1;
    summary.set(t, (summary.get(t) ?? 0) + qty);
    total += qty;
  }
  if (summary.size === 0) return null;
  return (
    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-emerald-300">📊 สรุปตามประเภทสินค้า</span>
        <Badge variant="outline" className="text-[10px]">รวม {total} ตัว</Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from(summary.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => (
            <Badge key={type} className="bg-card text-xs">
              {type}: <strong className="ml-1 text-orange-400">{count}</strong>
            </Badge>
          ))}
      </div>
    </div>
  );
}

export function RosterUpload({ jobId, onImported }: { jobId: string; onImported?: () => void }) {
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const aiTypes = ["pdf", "png", "jpg", "jpeg", "webp"];

    if (aiTypes.includes(ext)) {
      // Use AI parsing for PDF/images
      setAiLoading(true);
      setParsed(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/parse-roster", { method: "POST", body: formData });
        const data = (await res.json()) as { ok: boolean; rows?: ParsedRow[]; error?: string };

        if (!data.ok) {
          setParsed({ ok: false, error: data.error ?? "AI parse failed" });
          toast({ title: "AI อ่านไฟล์ไม่สำเร็จ", description: data.error, variant: "destructive" });
        } else {
          const rows = data.rows ?? [];
          setParsed({
            ok: true,
            rows,
            detectedColumns: { name: 0, number: 1, size: 2, item_type: 3 },
            headerRow: ["name", "number", "size", "item_type", "quantity"],
            totalRows: rows.length,
          });
          toast({ title: `AI อ่านได้ ${rows.length} แถว`, description: "ตรวจสอบก่อนนำเข้า" });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setParsed({ ok: false, error: msg });
        toast({ title: "AI อ่านไฟล์ไม่สำเร็จ", description: msg, variant: "destructive" });
      } finally {
        setAiLoading(false);
      }
      return;
    }

    // Excel/CSV — use local parser
    const buf = await file.arrayBuffer();
    const result = parseRosterFile(buf);
    setParsed(result);
    if (!result.ok) {
      toast({ title: "อ่านไฟล์ไม่สำเร็จ", description: result.error, variant: "destructive" });
    } else {
      toast({ title: `อ่านได้ ${result.totalRows} แถว`, description: "ตรวจสอบก่อนนำเข้า" });
    }
  }

  function reset() {
    setParsed(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleImport() {
    if (!parsed?.ok) return;
    const items: ParsedRow[] = parsed.rows;
    startTransition(async () => {
      const result = await saveJobItems(jobId, items);
      if (result.ok) {
        toast({ title: `นำเข้า ${items.length} รายชื่อแล้ว ✅` });
        reset();
        onImported?.();
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  function updateRow<K extends keyof ParsedRow>(idx: number, key: K, value: ParsedRow[K]) {
    if (!parsed?.ok) return;
    const newRows = parsed.rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
    setParsed({ ...parsed, rows: newRows });
  }

  function removeRow(idx: number) {
    if (!parsed?.ok) return;
    const newRows = parsed.rows.filter((_, i) => i !== idx);
    setParsed({ ...parsed, rows: newRows, totalRows: newRows.length });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="inline-flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-400" /> นำเข้ารายชื่อจากไฟล์
          <Badge variant="outline" className="ml-1 gap-1 text-[10px]">
            <Sparkles className="h-2.5 w-2.5 text-orange-400" /> AI อ่าน PDF/รูปได้
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {aiLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-medium">AI กำลังอ่านไฟล์...</div>
            <div className="text-xs text-muted-foreground">โดยทั่วไปใช้เวลา 10-30 วินาที</div>
          </div>
        ) : !parsed ? (
          <>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card/40 p-6 text-center transition hover:border-primary/50"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("border-primary");
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove("border-primary")}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-primary");
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <Upload className="h-7 w-7 text-muted-foreground" />
              <div className="text-sm font-medium">ลากไฟล์มาวาง หรือคลิกเลือก</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <FileSpreadsheet className="h-3 w-3" /> .xlsx .csv (ฟรี/เร็ว)
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <FileText className="h-3 w-3" /> .pdf .png .jpg (AI)
                </Badge>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            <details className="rounded-md border border-border bg-card/30 p-3 text-xs">
              <summary className="cursor-pointer font-medium">
                <Sparkles className="mr-1 inline h-3 w-3 text-orange-400" />
                Tip: เตรียมไฟล์ยังไงให้ระบบอ่านได้?
              </summary>
              <div className="mt-3 space-y-2 text-muted-foreground">
                <p>ในแถวแรก (หัวตาราง) ใส่ชื่อ column เช่น:</p>
                <div className="overflow-x-auto">
                  <table className="border border-border text-[11px]">
                    <thead className="bg-muted">
                      <tr>
                        <th className="border border-border px-2 py-1">ชื่อ</th>
                        <th className="border border-border px-2 py-1">เบอร์</th>
                        <th className="border border-border px-2 py-1">ไซส์</th>
                        <th className="border border-border px-2 py-1">สปอนเซอร์</th>
                        <th className="border border-border px-2 py-1">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border px-2 py-1">สมชาย</td>
                        <td className="border border-border px-2 py-1">9</td>
                        <td className="border border-border px-2 py-1">L</td>
                        <td className="border border-border px-2 py-1">SCB</td>
                        <td className="border border-border px-2 py-1">-</td>
                      </tr>
                      <tr>
                        <td className="border border-border px-2 py-1">มานี</td>
                        <td className="border border-border px-2 py-1">7</td>
                        <td className="border border-border px-2 py-1">M</td>
                        <td className="border border-border px-2 py-1">SCB</td>
                        <td className="border border-border px-2 py-1">แก้ขนาดให้ใหญ่</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>ชื่อ column ที่รู้จัก: <strong>ชื่อ/name</strong>, <strong>เบอร์/number/no.</strong>, <strong>ไซส์/size</strong>, <strong>sponsor/สปอนเซอร์</strong>, <strong>หมายเหตุ/note/remark</strong></p>
                <p>💡 ระบบจะข้ามแถวว่างเปล่าให้อัตโนมัติ</p>
              </div>
            </details>
          </>
        ) : !parsed.ok ? (
          <div className="space-y-2">
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <strong className="text-destructive">อ่านไฟล์ไม่สำเร็จ:</strong> {parsed.error}
            </div>
            <Button variant="outline" size="sm" onClick={reset}>ลองใหม่</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-medium">{fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    อ่านได้ {parsed.totalRows} แถว · column ที่ตรวจเจอ:{" "}
                    {Object.keys(parsed.detectedColumns).map((k) => (
                      <Badge key={k} variant="outline" className="ml-1 text-[10px]">{k}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* AI Summary by item_type */}
            <ItemTypeSummary rows={parsed.rows} />

            {/* Preview table */}
            <div className="max-h-[400px] overflow-auto rounded-md border border-border">
              <datalist id="roster-item-type-presets">
                {ITEM_TYPE_PRESETS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="w-16">เบอร์</TableHead>
                    <TableHead className="w-16">ไซส์</TableHead>
                    <TableHead className="w-16 text-center">จำนวน</TableHead>
                    <TableHead className="w-44">ประเภท</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
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
                          onChange={(e) => updateRow(idx, "size", e.target.value.toUpperCase())}
                          className="w-full bg-transparent text-center font-mono text-sm uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          min={1}
                          value={r.quantity}
                          onChange={(e) => updateRow(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-transparent text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          list="roster-item-type-presets"
                          value={r.item_type}
                          onChange={(e) => updateRow(idx, "item_type", e.target.value)}
                          className="w-full bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="เลือก/พิมพ์..."
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

            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <span>
                <strong className="text-amber-400">⚠️ คำเตือน:</strong> นำเข้าจะ <strong>ล้างรายชื่อเดิมใน JOB</strong> ทั้งหมด แล้วใส่ใหม่จากไฟล์
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={isPending}>ยกเลิก</Button>
              <Button onClick={handleImport} disabled={isPending || parsed.rows.length === 0}>
                {isPending ? "นำเข้า..." : `นำเข้า ${parsed.rows.length} รายชื่อ`}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
