"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Globe, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { togglePublicDesign } from "@/app/(admin)/designs/actions";

export function PublicToggle({ id, initial }: { id: string; initial: boolean }) {
  const [isPublic, setIsPublic] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !isPublic;
    setIsPublic(next);
    startTransition(async () => {
      const res = await togglePublicDesign(id, next);
      if (res.ok) {
        toast({ title: next ? "เผยแพร่ใน /portfolio แล้ว ✅" : "ซ่อนจาก /portfolio แล้ว" });
      } else {
        setIsPublic(!next);
        toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={isPending}
      className={
        isPublic
          ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
          : "border-border text-muted-foreground"
      }
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isPublic ? <Globe className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {isPublic ? "เผยแพร่ใน Portfolio" : "ส่วนตัว — กดเพื่อเผยแพร่"}
    </Button>
  );
}
