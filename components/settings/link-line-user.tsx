"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { linkLineUserToCustomer } from "@/app/(admin)/settings/actions";

export function LinkLineUserButton({
  lineUserId,
  displayName,
  customers,
}: {
  lineUserId: string;
  displayName: string;
  customers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!customerId) {
      toast({ title: "กรุณาเลือกลูกค้า", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const result = await linkLineUserToCustomer({
        customer_id: customerId,
        line_user_id: lineUserId,
        display_name: displayName,
      });
      if (result.ok) {
        toast({ title: "เชื่อมแล้ว — ลูกค้าจะได้รับ LINE แจ้งเตือนจากนี้" });
        setOpen(false);
        setCustomerId("");
      } else {
        toast({ title: "เชื่อมไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Link2 className="h-3 w-3" /> เชื่อม
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เชื่อม LINE user กับลูกค้า</DialogTitle>
            <DialogDescription>
              <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{lineUserId}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>เลือกลูกค้า</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="เลือกลูกค้าที่จะเชื่อม" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSubmit} disabled={isPending || !customerId}>
              {isPending ? "กำลังเชื่อม..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
