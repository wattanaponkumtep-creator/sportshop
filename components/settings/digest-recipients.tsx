"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  addDigestRecipient,
  toggleDigestRecipient,
  deleteDigestRecipient,
} from "@/app/(admin)/settings/notifications-actions";
import type { DigestRecipient } from "@/lib/types/database";

export function DigestRecipients({ recipients }: { recipients: DigestRecipient[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lineId, setLineId] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!lineId.trim()) {
      toast({ title: "กรุณาใส่ LINE User ID", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const res = await addDigestRecipient({ name: name || null, line_user_id: lineId });
      if (res.ok) {
        toast({ title: "เพิ่มผู้รับแล้ว ✅" });
        setName("");
        setLineId("");
        router.refresh();
      } else {
        toast({ title: "เพิ่มไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleDigestRecipient(id, !current);
      if (res.ok) router.refresh();
      else toast({ title: "ไม่สำเร็จ", description: res.error, variant: "destructive" });
    });
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`ลบผู้รับ "${label}"?`)) return;
    startTransition(async () => {
      const res = await deleteDigestRecipient(id);
      if (res.ok) {
        toast({ title: "ลบแล้ว" });
        router.refresh();
      } else {
        toast({ title: "ลบไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  const activeCount = recipients.filter((r) => r.is_active).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Users className="h-5 w-5 text-green-500" /> ผู้รับสรุปประจำวันเพิ่มเติม (หลาย LINE ID)
          {activeCount > 0 && <Badge variant="outline" className="text-xs">{activeCount} คน</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          เพิ่ม LINE ID ของคนอื่น (พนักงาน/หุ้นส่วน) ให้รับสรุปประจำวันด้วย — <strong>ไม่ต้องเป็น admin</strong>
          <br />ทุกคนจะได้ข้อความสรุปเดียวกันทุกเช้า 09:00 น. พร้อมกับคุณ
        </p>

        {/* Add form */}
        <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">ชื่อเรียก (ไม่บังคับ)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น พี่แดง, ฝ่ายผลิต" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">LINE User ID *</Label>
            <Input
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            เพิ่ม
          </Button>
        </div>

        <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[11px] text-muted-foreground">
          💡 <strong>หา LINE User ID ของแต่ละคน:</strong> ให้เขา Add LINE OA ของร้าน + ทักข้อความ →
          กลับมาดูที่ <strong>Webhook events</strong> ด้านล่าง → Copy LINE User ID ของเขา (ขึ้นต้น U...)
        </p>

        {/* List */}
        {recipients.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="text-xs font-semibold text-muted-foreground">รายชื่อผู้รับ ({recipients.length})</div>
            {recipients.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 p-2.5",
                  !r.is_active && "opacity-50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name || "(ไม่มีชื่อ)"}</span>
                    {!r.is_active && <Badge variant="outline" className="text-[10px]">ปิดอยู่</Badge>}
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{r.line_user_id}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggle(r.id, r.is_active)}
                    disabled={isPending}
                    title={r.is_active ? "ปิดการส่ง" : "เปิดการส่ง"}
                  >
                    {r.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(r.id, r.name || r.line_user_id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
