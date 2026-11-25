"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Copy, Check, MessageCircle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { formatDateTH } from "@/lib/utils";

type Props = {
  token: string;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
};

export function OrderConfirmAdmin({ token, confirmedAt, confirmedBy }: Props) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/confirm/${token}` : `/confirm/${token}`;

  if (confirmedAt) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <div className="font-semibold text-emerald-300">ลูกค้ายืนยันออเดอร์แล้ว ✅</div>
            <div className="text-xs text-muted-foreground">
              โดย {confirmedBy ?? "-"} · {formatDateTH(confirmedAt, "d MMM yy HH:mm")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Copy ลิงก์ยืนยันแล้ว" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy ไม่สำเร็จ", variant: "destructive" });
    }
  }

  function shareLINE() {
    const text = `🧾 ช่วยกดยืนยันออเดอร์ก่อนผลิตด้วยนะครับ (เช็กชื่อ-เบอร์-ไซซ์-จำนวนให้ถูกต้อง)\n${url}`;
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <Card className="border-2 border-violet-500/40 bg-violet-500/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
          <ClipboardCheck className="h-4 w-4" /> ยืนยันออเดอร์กับลูกค้า (ก่อนผลิต)
        </div>
        <p className="text-xs text-muted-foreground">
          ส่งลิงก์ให้ลูกค้าตรวจ จำนวน/รายชื่อ/ไซซ์/สเปค แล้วกดยืนยัน → เก็บเป็นหลักฐานกันเคลม
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
        </div>
        <Button size="sm" onClick={shareLINE} className="w-full bg-[#06C755] text-white hover:bg-[#05a647]">
          <MessageCircle className="h-3.5 w-3.5" /> ส่งให้ลูกค้ายืนยันทาง LINE
        </Button>
      </CardContent>
    </Card>
  );
}
