"use client";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Copy, Check, MessageCircle, Sparkles, Package } from "lucide-react";

// ───────── สินค้า/แพ็กเกจที่ร้านขาย (อิงประเภทสินค้าจริงของร้าน) ─────────
type Product = { id: string; name: string; tagline: string; points: string[] };
const PRODUCTS: Product[] = [
  {
    id: "team_set",
    name: "ชุดทีมเต็ม (เสื้อ + กางเกง)",
    tagline: "ใส่เป็นเซ็ต ดูโปรมืออาชีพ",
    points: ["เสื้อ + กางเกงเข้าชุดกัน", "ใส่ชื่อ–เบอร์หลังเสื้อรายคนได้", "ถ่ายรูปทีมสวยเป็นเซ็ตเดียวกัน"],
  },
  {
    id: "jersey",
    name: "เสื้อกีฬาพิมพ์ลาย (ซับลิเมชั่น)",
    tagline: "ลายเต็มตัว ไม่ลอก สีคมชัด",
    points: ["ไล่เฉดสี–ไล่โทนได้ไม่จำกัดสี", "ลายซึมเข้าเนื้อผ้า ซักไม่ลอกไม่แตก", "ใส่โลโก้/สปอนเซอร์คมชัด"],
  },
  {
    id: "polo",
    name: "เสื้อโปโลทีม/องค์กร",
    tagline: "สุภาพ ใส่ได้ทุกโอกาส",
    points: ["ปัก/พิมพ์โลโก้ได้", "ผ้าใส่สบาย ระบายอากาศดี", "เหมาะงานบริษัท/อีเวนต์/สตาฟ"],
  },
  {
    id: "addon",
    name: "ถุงเท้า / ปลอกแขน เข้าทีม",
    tagline: "เสริมให้ครบเซ็ต",
    points: ["สีเข้าชุดทีม", "เพิ่มทีเดียวตอนสั่งประหยัดกว่า"],
  },
];

// ───────── สถานการณ์ลูกค้า ─────────
type Situation = {
  id: string;
  label: string;
  emoji: string;
  opener: string;
  closer: string;
  trust: boolean; // แนบจุดขาย/ความน่าเชื่อถือไหม
  suggest?: string; // แนะนำสินค้าเริ่มต้น
};
const SITUATIONS: Situation[] = [
  {
    id: "new",
    label: "ลูกค้าใหม่ทักมา",
    emoji: "👋",
    opener: "สวัสดีครับ ขอบคุณที่สนใจ SportShop 🎽 ยินดีช่วยจัดเสื้อทีมให้ครับ",
    closer: "ส่งจำนวน + แบบที่อยากได้มาได้เลย เดี๋ยวจัดแบบ Mockup + เสนอราคาให้ฟรีครับ 🙏",
    trust: true,
    suggest: "jersey",
  },
  {
    id: "team",
    label: "อยากได้ชุดทีม",
    emoji: "💪",
    opener: "สำหรับทีม แนะนำจัดเป็นชุดเต็มให้ดูโปรไปเลยครับ",
    closer: "อยากให้จัดแบบชุดเต็มให้ดูก่อนไหมครับ? เริ่มได้เลย 👍",
    trust: true,
    suggest: "team_set",
  },
  {
    id: "price",
    label: "บอกว่าแพง / งบจำกัด",
    emoji: "💰",
    opener: "เข้าใจเรื่องงบครับ 🙏 เดี๋ยวจัดให้คุ้มที่สุดในงบที่มี",
    closer: "บอกงบที่สะดวกมาได้เลยครับ เดี๋ยวปรับสเปค/จำนวนให้พอดีงบ แต่ยังสวยและใส่ทนครับ",
    trust: true,
  },
  {
    id: "rush",
    label: "งานด่วน",
    emoji: "⏰",
    opener: "งานด่วนรับได้ครับ แต่ขอวางแผนเวลาให้ทันนะครับ",
    closer: "ยืนยันเร็ว = ได้คิวเร็ว ทันชัวร์กว่าครับ เริ่มเลยไหมครับ? เดี๋ยวจัดแบบให้ดูก่อนได้เลย",
    trust: false,
  },
  {
    id: "undecided",
    label: "ยังไม่ตัดสินใจ",
    emoji: "🤔",
    opener: "ไม่ต้องรีบตัดสินใจครับ ขอแนะนำข้อมูลให้ครบก่อน 🙂",
    closer: "มีคำถามอะไรถามได้ตลอดครับ พร้อมปรับสเปค/ราคา ให้เหมาะกับทีมของคุณ",
    trust: true,
  },
  {
    id: "repeat",
    label: "ลูกค้าเก่ากลับมา",
    emoji: "🎁",
    opener: "สวัสดีครับ 🙏 ยินดีต้อนรับกลับมาอีกครั้งครับ",
    closer: "🎁 ลูกค้าเก่ารับส่วนลด 5% ทุกออเดอร์ · แบบเดิมเราเก็บไฟล์ไว้ สั่งซ้ำได้เลย ไม่ต้องออกแบบใหม่ครับ",
    trust: false,
  },
];

const TRUST_LINES = [
  "✅ ทำ “ตัวอย่าง” ให้ดูก่อนผลิตยกล็อต — ไม่เสี่ยงพังทั้งทีม",
  "✅ ส่งแบบ Mockup ให้อนุมัติก่อนผลิตทุกครั้ง",
  "✅ มีลิงก์ติดตามสถานะงานออนไลน์ รู้ว่างานถึงไหนตลอด",
];

export function SalesAssistant() {
  const [situationId, setSituationId] = useState("new");
  const [productId, setProductId] = useState<string>("jersey");
  const [qty, setQty] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [copied, setCopied] = useState(false);

  const situation = SITUATIONS.find((s) => s.id === situationId)!;
  const product = PRODUCTS.find((p) => p.id === productId);

  function pickSituation(s: Situation) {
    setSituationId(s.id);
    if (s.suggest) setProductId(s.suggest);
  }

  const message = useMemo(() => {
    const lines: string[] = [situation.opener];

    const info: string[] = [];
    if (qty.trim()) info.push(`จำนวน ${qty.trim()} ตัว`);
    if (deadline.trim()) info.push(`ใช้วันที่ ${deadline.trim()}`);
    if (budget.trim()) info.push(`งบราว ${budget.trim()} บ./ตัว`);
    if (info.length) {
      lines.push("", `📋 ${info.join(" · ")}`);
    }

    if (product) {
      lines.push("", `📦 แนะนำ: ${product.name}`);
      lines.push(product.tagline);
      for (const p of product.points) lines.push(`• ${p}`);
    }

    if (situation.trust) {
      lines.push("", ...TRUST_LINES);
    }

    lines.push("", situation.closer);
    return lines.join("\n");
  }, [situation, product, qty, deadline, budget]);

  async function copyMsg() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast({ title: "Copy ข้อความแล้ว — วางใน LINE/FB ได้เลย ✅" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy ไม่สำเร็จ", variant: "destructive" });
    }
  }
  function shareLINE() {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" /> ผู้ช่วยขาย — สร้างข้อความแนะนำสินค้า+ปิดการขาย
        </div>

        {/* 1. สถานการณ์ */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">1. ลูกค้าอยู่ในสถานการณ์ไหน?</Label>
          <div className="flex flex-wrap gap-1.5">
            {SITUATIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickSituation(s)}
                className={cn(
                  "rounded-full border-2 px-3 py-1 text-xs transition",
                  situationId === s.id
                    ? "border-primary bg-primary/15 font-medium text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. สินค้า/แพ็กเกจ */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">2. แนะนำสินค้า/แพ็กเกจ</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(productId === p.id ? "" : p.id)}
                className={cn(
                  "rounded-lg border-2 p-2.5 text-left text-xs transition",
                  productId === p.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Package className="h-3.5 w-3.5 text-primary" /> {p.name}
                </div>
                <div className="mt-0.5 text-muted-foreground">{p.tagline}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. รายละเอียด (ไม่บังคับ) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">3. ใส่รายละเอียด (ไม่บังคับ — ใส่แล้วข้อความแน่นขึ้น)</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="จำนวน (ตัว)" inputMode="numeric" />
            <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="ใช้วันที่ เช่น 15 ธ.ค." />
            <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="งบ/ตัว (บาท)" inputMode="numeric" />
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">ข้อความที่จะส่ง (แก้ไขได้ที่ช่องด้านล่าง หรือ Copy เลย)</Label>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 font-sans text-xs leading-relaxed text-foreground/90">
            {message}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={shareLINE} className="flex-1 bg-[#06C755] text-white hover:bg-[#05a647]">
              <MessageCircle className="h-3.5 w-3.5" /> ส่งทาง LINE
            </Button>
            <Button size="sm" variant="outline" onClick={copyMsg} className="flex-1">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copy แล้ว!" : "Copy ข้อความ"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
