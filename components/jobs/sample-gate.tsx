"use client";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { FlaskConical, CheckCircle2, XCircle, Loader2, Lock } from "lucide-react";
import { approveSample, rejectSample } from "@/app/(admin)/jobs/sample-actions";
import { formatDateTH } from "@/lib/utils";

type Props = {
  jobId: string;
  sampleStatus: string;
  sampleApprovedAt?: string | null;
  sampleNote?: string | null;
};

export function SampleGate({ jobId, sampleStatus, sampleApprovedAt, sampleNote }: Props) {
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  if (sampleStatus === "approved") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-300">ตัวอย่างอนุมัติแล้ว — ผลิตเต็มล็อตได้ 🔓</div>
            {sampleApprovedAt && (
              <div className="text-xs text-muted-foreground">
                อนุมัติเมื่อ {formatDateTH(sampleApprovedAt, "d MMM yy HH:mm")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveSample(jobId);
      if (res.ok) {
        toast({
          title: res.advanced
            ? "อนุมัติตัวอย่าง — เลื่อนเป็น ผลิต + แจ้งลูกค้าแล้ว ✅"
            : "อนุมัติตัวอย่างแล้ว ✅",
        });
      } else {
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleReject() {
    if (!note.trim()) {
      toast({ title: "ใส่เหตุผลที่ให้แก้ด้วย", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const res = await rejectSample(jobId, note);
      if (res.ok) {
        toast({ title: "ตีกลับให้โรงงานแก้แล้ว" });
        setRejecting(false);
        setNote("");
      } else {
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <Card className="border-2 border-amber-500/40 bg-amber-500/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-amber-300">
          <FlaskConical className="h-4 w-4" /> ขั้นตอนตัวอย่าง
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
            <Lock className="h-3 w-3" /> ต้องผ่านก่อนผลิตเต็มล็อต
          </span>
        </div>

        {sampleStatus === "rejected" && sampleNote && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
            ❌ ตีกลับให้แก้: {sampleNote}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          โรงงานผลิต <b>ตัวอย่าง 1 ตัว/ชุด</b> → ตรวจ (สี / เบอร์ / ไซซ์ / ปลายแขน / โลโก้) เทียบแบบที่ลูกค้าอนุมัติ → กดอนุมัติเพื่อปลดล็อกผลิตเต็มล็อต
        </p>

        {rejecting ? (
          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="บอกโรงงานว่าต้องแก้อะไร เช่น สีเพี้ยน / เบอร์ผิด / ไซซ์ไม่ตรง..."
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                ส่งกลับให้แก้
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} disabled={isPending}>
                ยกเลิก
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              อนุมัติตัวอย่าง — ผลิตเต็มล็อตได้
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={isPending}>
              <XCircle className="h-4 w-4" /> ตัวอย่างไม่ผ่าน (ให้แก้)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
