"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, Send, CheckCircle2 } from "lucide-react";
import { postCustomerComment } from "@/app/track/actions";

export function CustomerCommentForm({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    if (!message.trim()) {
      setError("กรุณาพิมพ์ข้อความ");
      return;
    }

    startTransition(async () => {
      const result = await postCustomerComment({ token, message, name: name || null });
      if (result.ok) {
        setSuccess(true);
        setMessage("");
        setName("");
        router.refresh();
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MessageSquarePlus className="h-4 w-4 text-orange-400" />
          ตอบกลับ / สอบถาม
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          อยากให้แก้ไข สอบถามเพิ่ม หรือยืนยันแบบ? เขียนข้อความให้ทางร้านที่นี่ — ร้านจะเห็นใน Timeline ทันที
        </p>

        {success ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <div className="mt-2 text-sm font-semibold">ส่งข้อความแล้ว ✓</div>
            <p className="mt-1 text-xs text-muted-foreground">ทางร้านจะติดต่อกลับเร็ว ๆ นี้</p>
            <Button variant="ghost" size="sm" onClick={() => setSuccess(false)} className="mt-3">
              ส่งข้อความใหม่
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="track-name" className="text-xs">ชื่อ (ไม่บังคับ)</Label>
              <Input
                id="track-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ใส่ชื่อเพื่อให้ทางร้านรู้ว่าคุณเป็นใคร"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="track-msg" className="text-xs">ข้อความ *</Label>
              <Textarea
                id="track-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="เช่น&#10;• อยากเพิ่มเสื้อขนาด XL อีก 2 ตัว&#10;• ขอเปลี่ยนเบอร์เสื้อ&#10;• อยากเร่งให้ทันวันที่..."
                maxLength={1000}
              />
              <div className="text-right text-[10px] text-muted-foreground">
                {message.length}/1000
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button onClick={handleSubmit} disabled={isPending || !message.trim()} className="w-full">
              <Send className="h-4 w-4" />
              {isPending ? "กำลังส่ง..." : "ส่งข้อความให้ทางร้าน"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
