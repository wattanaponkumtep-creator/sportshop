"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle } from "lucide-react";
import { submitMockupDecision } from "@/app/approve/actions";

export function ApprovalForm({ token }: { token: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    if (!decision) {
      setError("กรุณาเลือก: อนุมัติ หรือ ขอแก้ไข");
      return;
    }
    if (decision === "reject" && !note.trim()) {
      setError("กรุณาใส่หมายเหตุว่าต้องการให้แก้ไขตรงไหน");
      return;
    }

    startTransition(async () => {
      const result = await submitMockupDecision({ token, decision, note: note || null, name: name || null });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ตอบกลับแบบเสื้อนี้</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDecision("approve")}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-5 transition ${
              decision === "approve"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border bg-card/40 hover:border-emerald-500/50"
            }`}
          >
            <CheckCircle2 className={`h-8 w-8 ${decision === "approve" ? "text-emerald-400" : "text-muted-foreground"}`} />
            <div className="font-semibold">อนุมัติ</div>
            <p className="text-center text-xs text-muted-foreground">ทางร้านสามารถเริ่มผลิตได้เลย</p>
          </button>

          <button
            type="button"
            onClick={() => setDecision("reject")}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-5 transition ${
              decision === "reject"
                ? "border-amber-500 bg-amber-500/10"
                : "border-border bg-card/40 hover:border-amber-500/50"
            }`}
          >
            <XCircle className={`h-8 w-8 ${decision === "reject" ? "text-amber-400" : "text-muted-foreground"}`} />
            <div className="font-semibold">ขอแก้ไข</div>
            <p className="text-center text-xs text-muted-foreground">บอกร้านว่าอยากให้แก้ตรงไหน</p>
          </button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">ชื่อของคุณ (ไม่บังคับ)</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ใส่ชื่อเพื่อให้ทางร้านรู้ว่าใครอนุมัติ"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">
            หมายเหตุ {decision === "reject" && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder={
              decision === "reject"
                ? "เช่น เปลี่ยนสีเป็นแดง เพิ่มชื่อสปอนเซอร์ด้านหลัง"
                : decision === "approve"
                ? "เช่น โอเค ผลิตได้เลย"
                : "ใส่ข้อความถึงทางร้าน (Optional ถ้าอนุมัติ)"
            }
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={isPending || !decision}
          size="lg"
          className="w-full"
          variant={decision === "reject" ? "destructive" : "default"}
        >
          {isPending
            ? "กำลังส่ง..."
            : decision === "approve"
            ? "ยืนยันการอนุมัติ"
            : decision === "reject"
            ? "ส่งคำขอแก้ไข"
            : "เลือกการตัดสินใจก่อน"}
        </Button>
      </CardContent>
    </Card>
  );
}
