"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { submitMockupDecision } from "@/app/approve/actions";

// รายการที่ลูกค้าต้องตรวจสอบก่อนอนุมัติ
const CHECK_ITEMS = [
  { key: "logo", label: "โลโก้ / ตราสัญลักษณ์", hint: "ตำแหน่ง รูปแบบ และความคมชัด ถูกต้องตามที่ต้องการ" },
  { key: "font", label: "ตัวอักษร / ฟอนต์", hint: "ชื่อทีม ชื่อ-นามสกุล เบอร์ สะกดถูกต้อง ครบทุกคน" },
  { key: "color", label: "สี", hint: "สีเสื้อ สีลาย และสีตัวอักษร ตรงตามที่ตกลง" },
  { key: "details", label: "รายละเอียดอื่น ๆ", hint: "สปอนเซอร์ ลาย ไซส์ และแบบโดยรวม ถูกต้องครบถ้วน" },
] as const;

type CheckKey = (typeof CHECK_ITEMS)[number]["key"];

export function ApprovalForm({ token }: { token: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    logo: false,
    font: false,
    color: false,
    details: false,
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allChecked = CHECK_ITEMS.every((it) => checks[it.key]);
  const canApprove = allChecked && agreed;

  function toggle(key: CheckKey) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
    if (decision === "approve" && !canApprove) {
      setError("กรุณาตรวจสอบให้ครบทุกข้อและยอมรับข้อตกลงก่อนอนุมัติ");
      return;
    }

    startTransition(async () => {
      const result = await submitMockupDecision({
        token,
        decision,
        note: note || null,
        name: name || null,
        checklist:
          decision === "approve"
            ? { logo: checks.logo, font: checks.font, color: checks.color, details: checks.details, agreed }
            : null,
      });
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
            <p className="text-center text-xs text-muted-foreground">ตรวจแล้วถูกต้อง เริ่มผลิตได้เลย</p>
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

        {/* Checklist ตรวจสอบ — แสดงเฉพาะตอนเลือก "อนุมัติ" */}
        {decision === "approve" && (
          <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              กรุณาตรวจสอบให้ครบก่อนยืนยัน
            </div>
            <p className="text-xs text-muted-foreground">
              โปรดขยายรูปดูให้ละเอียด แล้วติ๊กยืนยันแต่ละข้อว่าถูกต้อง
            </p>

            <div className="space-y-2">
              {CHECK_ITEMS.map((it) => (
                <label
                  key={it.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                    checks[it.key]
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-background/40 hover:border-emerald-500/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checks[it.key]}
                    onChange={() => toggle(it.key)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{it.label}</div>
                    <div className="text-xs text-muted-foreground">{it.hint}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* ข้อตกลงความรับผิดชอบ */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-md border-2 p-3 transition ${
                agreed ? "border-emerald-500 bg-emerald-500/10" : "border-amber-500/50 bg-amber-500/5"
              }`}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed((v) => !v)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold">ข้าพเจ้าได้ตรวจสอบแบบเสื้อโดยละเอียดแล้ว และยืนยันว่าถูกต้องทุกประการ</span>
                <br />
                เมื่อกดยืนยัน ทางร้านจะเริ่มผลิตตามแบบนี้ หากพบข้อผิดพลาดที่ตรงกับแบบที่อนุมัติไว้
                (โลโก้ ฟอนต์ สี ตัวสะกด ฯลฯ) ทางร้านขอสงวนสิทธิ์ไม่รับผิดชอบและไม่สามารถแก้ไข/คืนเงินได้
              </div>
            </label>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">ชื่อของคุณ {decision === "approve" && <span className="text-destructive">*</span>}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ใส่ชื่อผู้ยืนยันแบบ เพื่อเป็นหลักฐาน"
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
                ? "เช่น โอเค ผลิตได้เลย (ไม่บังคับ)"
                : "ใส่ข้อความถึงทางร้าน (Optional ถ้าอนุมัติ)"
            }
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={isPending || !decision || (decision === "approve" && !canApprove)}
          size="lg"
          className="w-full"
          variant={decision === "reject" ? "destructive" : "default"}
        >
          {isPending
            ? "กำลังส่ง..."
            : decision === "approve"
            ? canApprove
              ? "ยืนยันการอนุมัติ"
              : "กรุณาตรวจสอบให้ครบก่อน"
            : decision === "reject"
            ? "ส่งคำขอแก้ไข"
            : "เลือกการตัดสินใจก่อน"}
        </Button>
      </CardContent>
    </Card>
  );
}
