"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { LifeBuoy, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { createClaim, resolveClaim } from "@/app/(admin)/jobs/claim-actions";
import { formatDateTH } from "@/lib/utils";
import type { Claim } from "@/lib/types/database";

const FAULT_META: Record<string, { label: string; cls: string }> = {
  shop: { label: "ความผิดร้าน", cls: "bg-rose-500/20 text-rose-300" },
  factory: { label: "ความผิดโรงงาน", cls: "bg-amber-500/20 text-amber-300" },
  customer: { label: "ข้อมูลลูกค้า", cls: "bg-sky-500/20 text-sky-300" },
};

export function ClaimsPanel({ jobId, claims }: { jobId: string; claims: Claim[] }) {
  const [adding, setAdding] = useState(false);
  const [reason, setReason] = useState("");
  const [fault, setFault] = useState<"shop" | "customer" | "factory">("shop");
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!reason.trim()) return toast({ title: "ใส่รายละเอียดเคลม", variant: "destructive" });
    startTransition(async () => {
      const res = await createClaim({ job_id: jobId, reason, fault });
      if (res.ok) {
        toast({ title: "บันทึกเคลมแล้ว" });
        setReason("");
        setAdding(false);
      } else toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
    });
  }

  function resolve(claimId: string) {
    const resolution = window.prompt("สรุปการแก้ไข/ชดเชย (เช่น แก้ให้ใหม่ / คืนเงิน):", "") ?? "";
    startTransition(async () => {
      const res = await resolveClaim(claimId, jobId, resolution);
      if (res.ok) toast({ title: "ปิดเคลมแล้ว ✅" });
      else toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="inline-flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-rose-400" /> เคลม / รับประกัน ({claims.length})
          </span>
          {!adding && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> เปิดเคลม
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="ปัญหาที่ลูกค้าเคลม เช่น สีเพี้ยน / เบอร์ผิด / ไซซ์ไม่ตรง..."
              className="text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">ความผิด:</span>
              {(["shop", "factory", "customer"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFault(f)}
                  className={`rounded-md px-2 py-1 text-xs ${fault === f ? FAULT_META[f].cls : "bg-muted text-muted-foreground"}`}
                >
                  {FAULT_META[f].label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={add} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} บันทึกเคลม
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>ยกเลิก</Button>
            </div>
          </div>
        )}

        {claims.length === 0 && !adding ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีเคลม 👍
          </div>
        ) : (
          <div className="space-y-2">
            {claims.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg border p-3 text-sm ${c.status === "resolved" ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/40"}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge className={FAULT_META[c.fault]?.cls ?? ""}>{FAULT_META[c.fault]?.label ?? c.fault}</Badge>
                  {c.status === "resolved" ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300">ปิดแล้ว</Badge>
                  ) : (
                    <Badge className="bg-rose-500/20 text-rose-300">กำลังดำเนินการ</Badge>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {formatDateTH(c.created_at, "d MMM yy HH:mm")}
                  </span>
                </div>
                <div>{c.reason}</div>
                {c.resolution && (
                  <div className="mt-1 text-xs text-emerald-300">✅ {c.resolution}</div>
                )}
                {c.status !== "resolved" && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => resolve(c.id)} disabled={isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> ปิดเคลม (แก้/ชดเชยแล้ว)
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
