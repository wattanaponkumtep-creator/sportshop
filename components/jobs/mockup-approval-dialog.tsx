"use client";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquareShare, MessageCircle, Copy, Check, CheckCircle2, Info } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { markMockupApprovedManually } from "@/app/(admin)/jobs/mockup-actions";

export function MockupApprovalDialog({
  mockupId,
  jobId,
  version,
  approvalToken,
  jobCode,
  jobLabel,
  mockupTitle,
  customerName,
}: {
  mockupId: string;
  jobId: string;
  version: number;
  approvalToken: string;
  jobCode: string;
  jobLabel?: string | null;
  mockupTitle?: string | null;
  customerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmBy, setConfirmBy] = useState(customerName || "");
  const [isPending, startTransition] = useTransition();

  const approveUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/approve/${approvalToken}`;
  }, [approvalToken]);

  const defaultMessage = useMemo(() => {
    const head = [
      `🎨 แบบเสื้อพร้อมให้ตรวจสอบแล้วครับ`,
      `📋 งาน ${jobCode}${jobLabel ? ` · ${jobLabel}` : ""}${mockupTitle ? ` (${mockupTitle})` : ""}`,
    ];
    return [
      ...head,
      "",
      "รบกวนตรวจสอบให้ละเอียดก่อนยืนยันนะครับ 👇",
      "✅ โลโก้ / ตราสัญลักษณ์ (ตำแหน่ง รูปแบบ)",
      "✅ ตัวอักษร / ฟอนต์ — ชื่อ นามสกุล เบอร์ สะกดถูก ครบทุกคน",
      "✅ สี — สีเสื้อ สีลาย สีตัวอักษร",
      "✅ รายละเอียดอื่น ๆ — สปอนเซอร์ ลาย ไซส์",
      "",
      "⚠️ สำคัญมาก: เมื่อยืนยันแล้ว ทางร้านจะเริ่มผลิตตามแบบนี้ทันที",
      "หากภายหลังพบข้อผิดพลาดที่ตรงกับแบบที่อนุมัติ (โลโก้/ฟอนต์/สี/ตัวสะกด)",
      "ทางร้านขอสงวนสิทธิ์ไม่รับผิดชอบและไม่สามารถแก้ไข/คืนเงินได้",
      "จึงรบกวนตรวจให้ละเอียดนะครับ 🙏",
      "",
      "👉 กดดูรูปแบบเต็ม + ยืนยันที่นี่:",
      approveUrl,
      "",
      `✅ ถ้าถูกต้องแล้ว กดปุ่ม "อนุมัติ" ในลิงก์ หรือตอบกลับ "อนุมัติ" ได้เลยครับ`,
    ].join("\n");
  }, [jobCode, jobLabel, mockupTitle, approveUrl]);

  const [message, setMessage] = useState(defaultMessage);
  const [dirty, setDirty] = useState(false);
  if (!dirty && message !== defaultMessage) setMessage(defaultMessage);

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "คัดลอกข้อความแล้ว — paste ในแชทลูกค้าได้เลย" });
    setTimeout(() => setCopied(false), 2000);
  }

  function openLineShare() {
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, "_blank");
  }

  function handleManualApprove() {
    if (!confirm(`ยืนยันว่าลูกค้าอนุมัติ Mockup v${version} แล้ว (ทางแชท/โทร)?\nงานจะถูกส่งเข้าโรงงานต่อไป`)) return;
    startTransition(async () => {
      const result = await markMockupApprovedManually(mockupId, jobId, confirmBy);
      if (result.ok) {
        toast({ title: "บันทึกว่าลูกค้าอนุมัติแล้ว ✓" });
        setOpen(false);
      } else {
        toast({ title: "ไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquareShare className="h-4 w-4" /> ส่งข้อความ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ส่งให้ลูกค้าอนุมัติ — {customerName}</DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-1 text-xs">
              <Info className="h-3 w-3" />
              ข้อความมีรายการตรวจสอบ + เงื่อนไขครบ — ลูกค้าอ่านได้เลยแม้ไม่กดลิงค์
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">ข้อความที่จะส่ง (แก้ได้)</Label>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setDirty(true);
              }}
              rows={15}
              className="text-xs"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{message.length} ตัวอักษร</span>
              {dirty && (
                <button type="button" onClick={() => { setMessage(defaultMessage); setDirty(false); }} className="hover:text-foreground">
                  รีเซ็ตเป็นค่าเริ่มต้น
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={openLineShare}
              className="justify-start border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/15">
                <MessageCircle className="h-4 w-4 text-green-400" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm">LINE</span>
                <span className="text-[10px] text-muted-foreground">เปิดแอป + เลือกลูกค้า</span>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={handleCopy}
              className={`justify-start ${copied ? "border-emerald-500/60 bg-emerald-500/5" : ""}`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm">คัดลอกข้อความ</span>
                <span className="text-[10px] text-muted-foreground">paste ที่ไหนก็ได้</span>
              </div>
            </Button>
          </div>

          {/* อนุมัติแทน — ลูกค้ายืนยันทางแชท */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> ลูกค้ายืนยันทางแชทแล้ว?
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">
              ถ้าลูกค้าตอบ &quot;อนุมัติ&quot; ในแชท/โทรมา กดปุ่มนี้เพื่อบันทึกแทน — งานจะถูกส่งเข้าโรงงานต่อ
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={confirmBy}
                onChange={(e) => setConfirmBy(e.target.value)}
                placeholder="ชื่อผู้ยืนยัน (เช่น ลูกค้า/พี่โจ้)"
                className="h-9 text-sm"
              />
              <Button
                onClick={handleManualApprove}
                disabled={isPending}
                className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <CheckCircle2 className="h-4 w-4" /> {isPending ? "กำลังบันทึก..." : "บันทึกว่าอนุมัติแล้ว"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
