"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Copy, Loader2 } from "lucide-react";
import { reorderJob } from "@/app/(admin)/jobs/reorder-actions";

export function ReorderButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (!confirm("สร้างงานใหม่โดยคัดลอกแบบ + รายชื่อ + สเปค จากงานนี้?")) return;
    startTransition(async () => {
      const res = await reorderJob(jobId);
      if (res.ok) {
        toast({ title: "สร้างงานสั่งซ้ำแล้ว ✅ — แก้รายชื่อ/จำนวนได้เลย" });
        router.push(`/jobs/${res.newJobId}`);
      } else {
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      สั่งซ้ำ
    </Button>
  );
}
