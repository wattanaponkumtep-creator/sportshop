"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { deleteCustomer } from "@/app/(admin)/customers/actions";

export function DeleteCustomerButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteCustomer(customerId);
      if (result.ok) {
        toast({ title: "ลบลูกค้าแล้ว" });
        setOpen(false);
        setConfirmText("");
        router.push("/customers");
      } else {
        toast({ title: "ลบไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmText(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="ลบลูกค้า">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบลูกค้า</DialogTitle>
          <DialogDescription>
            การกระทำนี้ <strong className="text-destructive">ไม่สามารถยกเลิกได้</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p>คุณกำลังจะลบลูกค้า <strong>{customerName}</strong></p>
            <p className="mt-2 text-muted-foreground">
              ⚠️ ช่องทางติดต่อทั้งหมดของลูกค้านี้จะถูกลบด้วย
            </p>
            <p className="mt-1 text-muted-foreground">
              ⚠️ ถ้าลูกค้ามีงานอยู่ ระบบจะป้องกันการลบ — ลบงานทั้งหมดก่อน
            </p>
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
