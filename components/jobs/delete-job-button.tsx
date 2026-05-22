"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { deleteJob } from "@/app/(admin)/jobs/actions";

export function DeleteJobButton({ jobId, jobCode }: { jobId: string; jobCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteJob(jobId);
      if (result.ok) {
        toast({ title: "ลบงานแล้ว" });
        setOpen(false);
        setConfirmText("");
        router.push("/jobs");
      } else {
        toast({ title: "ลบไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmText(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="ลบงาน">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบงาน {jobCode}</DialogTitle>
          <DialogDescription>
            การกระทำนี้ <strong className="text-destructive">ไม่สามารถยกเลิกได้</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p>คุณกำลังจะลบงาน <strong className="font-mono">{jobCode}</strong> ถาวร</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>⚠️ ข้อมูลต่อไปนี้จะถูกลบทั้งหมด:</p>
              <ul className="ml-4 list-disc space-y-0.5">
                <li>รายชื่อ/ไซส์ทุกแถว</li>
                <li>ไฟล์ที่อัปโหลด (AI, PSD, PNG, สลิป)</li>
                <li>Mockup ทุกเวอร์ชัน</li>
                <li>ประวัติการชำระเงิน + สลิป</li>
                <li>Timeline ทั้งหมด</li>
                <li>ข้อมูลโรงงาน + การจัดส่ง</li>
              </ul>
              <p className="pt-2">💡 ถ้าแค่ยกเลิกงาน — ใช้สถานะ <strong>&quot;ยกเลิก&quot;</strong> แทน (เก็บข้อมูลไว้)</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>พิมพ์ <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ลบ</code> เพื่อยืนยัน</Label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ลบ" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setConfirmText(""); }}>
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || confirmText !== "ลบ"}
          >
            {isPending ? "กำลังลบ..." : "ลบถาวร"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
