"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { manualSendLineNotification } from "@/app/(admin)/jobs/notify-actions";
import { toast } from "@/components/ui/use-toast";

export function ManualNotifyButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!confirm("ส่งแจ้งเตือนสถานะปัจจุบันไป LINE ลูกค้า?")) return;
    startTransition(async () => {
      const result = await manualSendLineNotification(jobId);
      if (result.ok) {
        toast({ title: `ส่งแล้ว ${result.sent}/${result.total} ราย` });
      } else {
        toast({ title: "ส่งไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleSend} disabled={isPending}>
      <MessageSquare className="h-4 w-4" />
      {isPending ? "กำลังส่ง..." : "ส่ง LINE"}
    </Button>
  );
}
