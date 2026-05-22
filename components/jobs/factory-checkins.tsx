"use client";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MapPin, Phone, Clock } from "lucide-react";
import { formatDateTH, timeAgo } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { addFactoryCheckin, deleteFactoryCheckin } from "@/app/(admin)/jobs/production-actions";
import type { FactoryCheckin } from "@/lib/types/database";

const QUICK_STATUSES = [
  "ส่งไฟล์แล้ว",
  "เริ่มผลิต",
  "พิมพ์เสร็จ",
  "เริ่มเย็บ",
  "เย็บเสร็จ",
  "QC ผ่าน",
  "พร้อมส่ง",
  "ล่าช้า",
];

export function FactoryCheckins({
  jobId,
  factories,
  currentFactoryId,
  checkins,
}: {
  jobId: string;
  factories: { id: string; name: string }[];
  currentFactoryId: string | null;
  checkins: FactoryCheckin[];
}) {
  const [adding, setAdding] = useState(false);
  const [factoryId, setFactoryId] = useState(currentFactoryId ?? "");
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!status.trim()) {
      toast({ title: "กรุณาใส่สถานะ", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const result = await addFactoryCheckin(jobId, {
        factory_id: factoryId || null,
        status,
        note: note || null,
      });
      if (result.ok) {
        toast({ title: "บันทึก check-in แล้ว" });
        setStatus("");
        setNote("");
        setAdding(false);
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("ลบบันทึก check-in นี้?")) return;
    startTransition(async () => {
      const result = await deleteFactoryCheckin(id, jobId);
      if (!result.ok) toast({ title: "ลบไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  const lastCheckin = checkins[0];
  const hoursSinceLast = lastCheckin
    ? Math.floor((Date.now() - new Date(lastCheckin.created_at).getTime()) / (1000 * 60 * 60))
    : null;

  const staleLevel =
    hoursSinceLast == null ? "never" : hoursSinceLast > 48 ? "urgent" : hoursSinceLast > 24 ? "stale" : "fresh";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold">เช็คอินโรงงาน</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
            <Plus className="h-4 w-4" /> เพิ่มบันทึก
          </Button>
        </div>

        {/* Status alert */}
        {lastCheckin ? (
          <div
            className={`mb-3 rounded-md border-l-4 bg-card/40 p-3 ${
              staleLevel === "urgent"
                ? "border-l-destructive bg-destructive/5"
                : staleLevel === "stale"
                ? "border-l-amber-500 bg-amber-500/5"
                : "border-l-cyan-500"
            }`}
          >
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">เช็คล่าสุด</div>
            <div className="mt-1 text-sm font-semibold">
              {lastCheckin.status}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {timeAgo(lastCheckin.created_at)}
              </span>
            </div>
            {lastCheckin.note && (
              <div className="mt-1 text-xs text-muted-foreground">{lastCheckin.note}</div>
            )}
          </div>
        ) : (
          <div className="mb-3 rounded-md border-l-4 border-l-muted bg-card/40 p-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> ยังไม่มี check-in
            </span>
          </div>
        )}

        {/* Add form */}
        {adding && (
          <div className="mb-3 space-y-3 rounded-md border border-dashed border-border bg-background/40 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">โรงงาน</Label>
                <Select value={factoryId} onValueChange={setFactoryId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="เลือกโรงงาน" /></SelectTrigger>
                  <SelectContent>
                    {factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">สถานะ *</Label>
                <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="เช่น เริ่มพิมพ์" className="h-8 text-xs" />
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {QUICK_STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={status === s ? "default" : "outline"}
                  className="h-6 text-[10px]"
                  onClick={() => setStatus(s)}
                >
                  {s}
                </Button>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">หมายเหตุ</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น โทรคุยกับคุณเปา ยืนยันจะเสร็จศุกร์นี้"
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>ยกเลิก</Button>
              <Button size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending ? "บันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {checkins.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              ประวัติทั้งหมด ({checkins.length})
            </div>
            {checkins.map((ch) => {
              const fac = factories.find((f) => f.id === ch.factory_id);
              return (
                <div key={ch.id} className="flex gap-3 rounded-md border border-border bg-card/30 p-2.5">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="font-mono text-[10px] font-semibold text-muted-foreground">
                      {formatDateTH(ch.created_at, "d MMM")}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">
                      {formatDateTH(ch.created_at, "HH:mm")}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ch.status}</span>
                      {fac && <Badge variant="outline" className="text-[10px]">{fac.name}</Badge>}
                    </div>
                    {ch.note && <div className="mt-0.5 text-xs text-muted-foreground">{ch.note}</div>}
                  </div>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
