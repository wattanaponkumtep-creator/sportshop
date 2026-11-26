"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Users, Pencil, CheckCircle2 } from "lucide-react";
import { submitRoster } from "@/app/roster/actions";

const SIZES = ["SS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

type Row = { name: string; number: string; size: string };

const empty = (): Row => ({ name: "", number: "", size: "" });

export function RosterEntryForm({ token, initialRows }: { token: string; initialRows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initialRows.length ? initialRows : [empty(), empty(), empty()],
  );
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"view" | "edit">(initialRows.length > 0 ? "view" : "edit");

  const numberCounts = new Map<string, number>();
  for (const r of rows) {
    const n = r.number.trim();
    if (n) numberCounts.set(n, (numberCounts.get(n) ?? 0) + 1);
  }

  const update = (i: number, field: keyof Row, val: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const addRow = () => setRows((rs) => [...rs, empty()]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const filledCount = rows.filter((r) => r.name || r.number || r.size).length;

  function submit() {
    setErr(null);
    const filled = rows.filter((r) => r.name || r.number || r.size);
    if (filled.length === 0) return setErr("กรุณากรอกอย่างน้อย 1 คน");
    for (const r of filled) {
      if (!r.name.trim() || !r.size.trim()) return setErr("แต่ละคนต้องมี ชื่อ + ไซซ์ ให้ครบ");
    }
    startTransition(async () => {
      const res = await submitRoster({ token, rows: filled });
      if (res.ok) {
        setMode("view");
        router.refresh();
      } else setErr(res.error);
    });
  }

  if (mode === "view") {
    const filled = rows.filter((r) => r.name || r.number || r.size);
    const sizeTally = new Map<string, number>();
    for (const r of filled) {
      const s = r.size.trim() || "ไม่ระบุ";
      sizeTally.set(s, (sizeTally.get(s) ?? 0) + 1);
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> รายชื่อของคุณ ({filled.length} คน)
          </div>
          <button
            onClick={() => setMode("edit")}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:border-primary hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> แก้ไข
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">ชื่อ</th>
                <th className="p-2 text-center">เบอร์</th>
                <th className="p-2 text-center">ไซซ์</th>
              </tr>
            </thead>
            <tbody>
              {filled.map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="p-2 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="p-2">{r.name || "-"}</td>
                  <td className="p-2 text-center font-mono">{r.number || "-"}</td>
                  <td className="p-2 text-center font-semibold">{r.size || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border bg-card/40 p-2.5 text-xs">
          <b>สรุปไซซ์:</b>{" "}
          {Array.from(sizeTally.entries()).map(([s, n]) => `${s}×${n}`).join("  ")} ·{" "}
          <b>รวม {filled.length} ตัว</b>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ✅ ตรวจสอบว่าถูกต้องไหม — ถ้ามีผิดกด <b>แก้ไข</b> ด้านบน
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-primary" /> กรอกรายชื่อ ({filledCount} คน)
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => {
          const dup = r.number.trim() && (numberCounts.get(r.number.trim()) ?? 0) > 1;
          return (
            <div key={i} className="rounded-lg border border-border bg-card p-2.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">#{i + 1}</span>
                <input
                  value={r.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  placeholder="ชื่อบนเสื้อ"
                  className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => removeRow(i)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label="ลบ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={r.number}
                  onChange={(e) => update(i, "number", e.target.value)}
                  placeholder="เบอร์"
                  inputMode="numeric"
                  className={`w-24 rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary ${
                    dup ? "border-rose-500 text-rose-400" : "border-border"
                  }`}
                />
                <select
                  value={r.size}
                  onChange={(e) => update(i, "size", e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">เลือกไซซ์</option>
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {dup && <p className="mt-1 text-[11px] text-rose-400">⚠️ เบอร์ {r.number} ซ้ำกับคนอื่น</p>}
            </div>
          );
        })}
      </div>

      <button
        onClick={addRow}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" /> เพิ่มคน
      </button>

      {err && <p className="text-sm text-rose-400">{err}</p>}

      <button
        onClick={submit}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        ส่งรายชื่อให้ร้าน
      </button>
    </div>
  );
}
