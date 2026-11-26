"use client";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Copy, Check, MessageCircle, ExternalLink, Save, Sheet, Pencil } from "lucide-react";
import { saveSheetUrl } from "@/app/(admin)/jobs/actions";

type Props = {
  jobId: string;
  sheetUrl: string | null;
};

export function SheetLinkCard({ jobId, sheetUrl }: Props) {
  const [value, setValue] = useState(sheetUrl ?? "");
  const [saved, setSaved] = useState(sheetUrl ?? "");
  const [editing, setEditing] = useState(!sheetUrl);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    const clean = value.trim();
    if (clean && !/^https?:\/\//i.test(clean)) {
      toast({ title: "ลิงก์ไม่ถูกต้อง", description: "ต้องขึ้นต้นด้วย http:// หรือ https://", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const res = await saveSheetUrl(jobId, clean);
      if (res.ok) {
        setSaved(clean);
        setEditing(false);
        toast({ title: clean ? "บันทึกลิงก์ใบงานแล้ว" : "ลบลิงก์แล้ว" });
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(saved);
      setCopied(true);
      toast({ title: "Copy ลิงก์ใบงานแล้ว" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy ไม่สำเร็จ", variant: "destructive" });
    }
  }

  function shareLINE() {
    const text = `📋 ส่งใบงาน (Google Sheet) ให้ช่วยเช็ก/กรอก ชื่อ-เบอร์-ไซซ์ ของทีมให้ครบถูกต้องด้วยนะครับ:\n${saved}`;
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <Card className="border border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="space-y-2.5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Sheet className="h-4 w-4" /> ใบงาน Google Sheet (ให้ลูกค้าเช็ก)
          </div>
          {saved && !editing && (
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">✅ ผูกลิงก์แล้ว</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          วางลิงก์ Google Sheet ใบงานของคุณ → ส่งให้ลูกค้าเปิดเช็ก/กรอก ชื่อ-เบอร์-ไซซ์ เอง (ตั้งค่าแชร์ชีตให้ลูกค้าดู/แก้ได้ก่อนส่ง)
        </p>

        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 font-mono text-xs"
            />
            <Button size="sm" onClick={save} disabled={isPending}>
              <Save className="h-3.5 w-3.5" /> บันทึก
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={saved}
              readOnly
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
              className="flex-1 font-mono text-xs"
            />
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} title="แก้ลิงก์">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={copy} title="Copy">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(saved, "_blank")}
              title="เปิดชีต"
            >
              <ExternalLink className="h-3.5 w-3.5" /> เปิด
            </Button>
            <Button size="sm" onClick={shareLINE} className="bg-[#06C755] text-white hover:bg-[#05a647]">
              <MessageCircle className="h-3.5 w-3.5" /> ส่งให้ลูกค้า
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
