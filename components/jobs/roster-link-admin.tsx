"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Copy, Check, MessageCircle, Users } from "lucide-react";
import { formatDateTH } from "@/lib/utils";

type Props = {
  token: string;
  submittedAt?: string | null;
  itemCount: number;
};

export function RosterLinkAdmin({ token, submittedAt, itemCount }: Props) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/roster/${token}` : `/roster/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Copy ลิงก์กรอกรายชื่อแล้ว" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy ไม่สำเร็จ", variant: "destructive" });
    }
  }

  function shareLINE() {
    const text = `📝 ช่วยกรอกรายชื่อ-เบอร์-ไซซ์ ของทีมให้ด้วยนะครับ (กรอกเองเพื่อความถูกต้อง):\n${url}`;
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <Card className="border border-primary/30 bg-primary/5">
      <CardContent className="space-y-2.5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Users className="h-4 w-4" /> ให้ลูกค้ากรอกรายชื่อเอง
          </div>
          {submittedAt ? (
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">
              ✅ ลูกค้ากรอกแล้ว {itemCount} คน · {formatDateTH(submittedAt, "d MMM yy HH:mm")}
            </span>
          ) : (
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-200">ยังไม่กรอก</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          ส่งลิงก์ให้ลูกค้ากรอกเอง → ข้อมูลเข้าระบบตรง ไม่ต้องคีย์เอง (ถ้าผิดก็เป็นข้อมูลที่ลูกค้ากรอก)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={url}
            readOnly
            onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            className="flex-1 font-mono text-xs"
          />
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" onClick={shareLINE} className="bg-[#06C755] text-white hover:bg-[#05a647]">
            <MessageCircle className="h-3.5 w-3.5" /> LINE
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
