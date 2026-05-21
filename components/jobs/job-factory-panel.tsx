"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FACTORY_STATUS_LABEL } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { upsertFactoryJob } from "@/app/(admin)/jobs/actions";
import type { FactoryJob, FactoryJobStatus } from "@/lib/types/database";
import { formatDateTH } from "@/lib/utils";

const STATUSES: FactoryJobStatus[] = ["sent", "producing", "sewing", "qc", "returned"];

export function JobFactoryPanel({
  jobId,
  factories,
  currentFactoryId,
  factoryJobs,
}: {
  jobId: string;
  factories: { id: string; name: string }[];
  currentFactoryId: string | null;
  factoryJobs: FactoryJob[];
}) {
  const [factoryId, setFactoryId] = useState(currentFactoryId ?? "");
  const [status, setStatus] = useState<FactoryJobStatus>("sent");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!factoryId) {
      toast({ title: "กรุณาเลือกโรงงาน", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const result = await upsertFactoryJob(jobId, {
        factory_id: factoryId,
        status,
        cost: cost ? Number(cost) : undefined,
        note: note || null,
      });
      if (result.ok) {
        toast({ title: "อัปเดตโรงงานแล้ว" });
        setNote("");
        setCost("");
      } else toast({ title: "อัปเดตไม่สำเร็จ", description: result.error, variant: "destructive" });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>มอบหมายงานให้โรงงาน</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>โรงงาน</Label>
              <Select value={factoryId} onValueChange={setFactoryId}>
                <SelectTrigger><SelectValue placeholder="เลือกโรงงาน" /></SelectTrigger>
                <SelectContent>
                  {factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>สถานะโรงงาน</Label>
              <Select value={status} onValueChange={(v: FactoryJobStatus) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{FACTORY_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>ต้นทุนโรงงาน (บาท)</Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isPending}>{isPending ? "กำลังบันทึก..." : "อัปเดต"}</Button>
          </div>
        </CardContent>
      </Card>

      {factoryJobs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>ประวัติโรงงาน</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {factoryJobs.map((fj) => {
              const f = factories.find((x) => x.id === fj.factory_id);
              return (
                <div key={fj.id} className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <div>
                    <div className="font-medium">{f?.name ?? "(ลบแล้ว)"}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{FACTORY_STATUS_LABEL[fj.status]}</Badge>
                      {fj.sent_at && <span>ส่ง {formatDateTH(fj.sent_at, "d MMM HH:mm")}</span>}
                      {fj.returned_at && <span>กลับ {formatDateTH(fj.returned_at, "d MMM HH:mm")}</span>}
                    </div>
                  </div>
                  {fj.note && <div className="max-w-xs text-right text-xs text-muted-foreground">{fj.note}</div>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
