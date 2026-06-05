"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Save, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { updateInquiryStatus, updateInquiryNote, deleteInquiry, convertToCustomer } from "@/app/(admin)/inquiries/actions";
import type { InquiryStatus } from "@/lib/types/database";

const STATUS_OPTIONS: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "📨 ใหม่" },
  { value: "contacted", label: "📞 ติดต่อแล้ว" },
  { value: "quoted", label: "💰 เสนอราคาแล้ว" },
  { value: "converted", label: "✅ ปิดดีล" },
  { value: "rejected", label: "❌ ไม่สนใจ" },
];

export function InquiryActions({
  id,
  currentStatus,
  adminNote,
  converted,
}: {
  id: string;
  currentStatus: InquiryStatus;
  adminNote: string | null;
  converted: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<InquiryStatus>(currentStatus);
  const [note, setNote] = useState(adminNote ?? "");
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(next: InquiryStatus) {
    setStatus(next);
    startTransition(async () => {
      const res = await updateInquiryStatus(id, next);
      if (res.ok) toast({ title: "อัพเดท status แล้ว" });
      else {
        setStatus(currentStatus);
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleSaveNote() {
    startTransition(async () => {
      const res = await updateInquiryNote({ id, admin_note: note });
      if (res.ok) toast({ title: "บันทึก note แล้ว ✅" });
      else toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
    });
  }

  function handleConvert() {
    if (!confirm("แปลงคำขอนี้เป็นลูกค้าใหม่?")) return;
    startTransition(async () => {
      const res = await convertToCustomer(id);
      if (res.ok) {
        toast({ title: "สร้างลูกค้าใหม่แล้ว ✅" });
        router.push(`/customers/${res.customerId}`);
      } else {
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleDelete() {
    if (!confirm("ลบคำขอนี้?")) return;
    startTransition(async () => {
      const res = await deleteInquiry(id);
      if (res.ok) {
        toast({ title: "ลบแล้ว" });
        router.push("/inquiries");
      } else {
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-3 lg:sticky lg:top-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">การจัดการ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">สถานะ</Label>
            <Select value={status} onValueChange={(v) => handleStatusChange(v as InquiryStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs">โน้ตภายใน</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="เช่น โทรไม่รับ จะลองอีกพรุ่งนี้..."
              className="text-sm"
            />
            <Button size="sm" onClick={handleSaveNote} disabled={isPending} variant="outline" className="w-full">
              <Save className="h-3.5 w-3.5" /> บันทึกโน้ต
            </Button>
          </div>

          {!converted && (
            <Button onClick={handleConvert} disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              สร้างเป็นลูกค้าใหม่
            </Button>
          )}

          <Button onClick={handleDelete} disabled={isPending} variant="destructive" size="sm" className="w-full">
            <Trash2 className="h-3.5 w-3.5" /> ลบคำขอ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
