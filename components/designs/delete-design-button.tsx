"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteDesign } from "@/app/(admin)/designs/actions";
import { toast } from "@/components/ui/use-toast";

export function DeleteDesignButton({ id, code, name }: { id: string; code: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`ลบดีไซน์ "${code} - ${name}"?\n\n⚠️ รูปทั้งหมดจะถูกลบด้วย\nงาน (JOBs) ที่ใช้ดีไซน์นี้จะยังอยู่ — แต่ลิงก์จะหายไป`)) return;
    startTransition(async () => {
      const result = await deleteDesign(id);
      if (result.ok) {
        toast({ title: "ลบดีไซน์แล้ว" });
        router.push("/designs");
      } else {
        toast({ title: "ลบไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClick} disabled={isPending}>
      <Trash2 className="h-3.5 w-3.5" /> {isPending ? "กำลังลบ..." : "ลบดีไซน์"}
    </Button>
  );
}
