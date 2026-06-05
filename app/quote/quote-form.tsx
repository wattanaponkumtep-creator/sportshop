"use client";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, CheckCircle2, User, Phone, Mail, MessageCircle, Users, Package, Hash, Wallet, MessageSquare } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { submitQuoteInquiry } from "./actions";

const PRODUCT_OPTIONS = [
  "เสื้อบอล",
  "เสื้อโปโล",
  "เสื้อตะกร้อ",
  "เสื้อบาส",
  "เสื้อวอลเลย์บอล",
  "เสื้อแบดมินตัน",
  "เสื้อวิ่ง / มาราธอน",
  "เสื้อรักบี้",
  "เสื้อ E-Sports",
  "อื่นๆ",
];

export function QuoteForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "กรุณาใส่ชื่อ", variant: "destructive" });
      return;
    }
    if (!phone.trim() && !email.trim() && !lineId.trim()) {
      toast({ title: "กรุณาใส่ช่องทางติดต่ออย่างน้อย 1 ช่อง", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const res = await submitQuoteInquiry({
        name,
        phone: phone || null,
        email: email || null,
        line_id: lineId || null,
        team_name: teamName || null,
        product_type: productType || null,
        quantity: quantity ? Number(quantity) : null,
        budget: budget ? Number(budget) : null,
        message: message || null,
      });
      if (res.ok) {
        setSubmitted(true);
        toast({ title: "ส่งคำขอแล้ว ✅ — ทางร้านจะติดต่อกลับโดยเร็ว" });
      } else {
        toast({ title: "ส่งไม่สำเร็จ", description: res.error, variant: "destructive" });
      }
    });
  }

  if (submitted) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="space-y-3 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="font-display text-xl font-bold text-emerald-300">ส่งคำขอเรียบร้อย!</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            ขอบคุณที่สนใจ! ทางร้านจะติดต่อกลับ {phone || email || `LINE: ${lineId}`} โดยเร็วที่สุด
            <br />ปกติภายใน 24 ชม.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setName("");
              setPhone("");
              setEmail("");
              setLineId("");
              setTeamName("");
              setProductType("");
              setQuantity("");
              setBudget("");
              setMessage("");
            }}
          >
            ส่งคำขออีกครั้ง
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact section */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">ข้อมูลติดต่อ</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="inline-flex items-center gap-1.5 text-xs">
                  <User className="h-3 w-3" /> ชื่อ-นามสกุล *
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="inline-flex items-center gap-1.5 text-xs">
                    <Phone className="h-3 w-3" /> เบอร์โทร
                  </Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081-234-5678" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="line" className="inline-flex items-center gap-1.5 text-xs">
                    <MessageCircle className="h-3 w-3" /> LINE ID
                  </Label>
                  <Input id="line" value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="@sportshop" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="inline-flex items-center gap-1.5 text-xs">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">📞 อย่างน้อย 1 ช่องทาง (ทางร้านจะติดต่อกลับ)</p>
            </div>
          </div>

          {/* Order details */}
          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-semibold">รายละเอียดสินค้า</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="team" className="inline-flex items-center gap-1.5 text-xs">
                  <Users className="h-3 w-3" /> ชื่อทีม / องค์กร
                </Label>
                <Input id="team" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="ทีม PUA Sport" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="inline-flex items-center gap-1.5 text-xs">
                    <Package className="h-3 w-3" /> ประเภทสินค้า
                  </Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger>
                      <SelectValue placeholder="-- เลือก --" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qty" className="inline-flex items-center gap-1.5 text-xs">
                    <Hash className="h-3 w-3" /> จำนวน (ตัว)
                  </Label>
                  <Input id="qty" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="25" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="budget" className="inline-flex items-center gap-1.5 text-xs">
                    <Wallet className="h-3 w-3" /> งบโดยรวม (฿)
                  </Label>
                  <Input id="budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="15000" />
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="message" className="inline-flex items-center gap-1.5 text-xs">
              <MessageSquare className="h-3 w-3" /> รายละเอียดเพิ่มเติม
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="เช่น อยากได้สีน้ำเงิน-ขาว แขนยาว มีโลโก้ทีม / ส่งภายในเดือนหน้า..."
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:shadow-lg">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isPending ? "กำลังส่ง..." : "ส่งคำขอใบเสนอราคา"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
