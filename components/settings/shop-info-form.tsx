"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Store, Save, Loader2, Wallet, Info } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { updateShopInfo } from "@/app/(admin)/settings/actions";

type ShopInfo = {
  shop_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  bank_info: string | null;
};

const BANK_INFO_PLACEHOLDER = `🏦 ธนาคารกสิกรไทย (KBANK)
เลขบัญชี: 123-4-56789-0
ชื่อบัญชี: บจก. สปอร์ตช็อป

📱 PromptPay: 0812345678 (ชื่อร้านสปอร์ตช็อป)

⏱️ เงื่อนไข: มัดจำ 50% ก่อนเริ่มงาน — ส่วนที่เหลือก่อนรับของ`;

export function ShopInfoForm({ initial }: { initial: ShopInfo | null }) {
  const [shopName, setShopName] = useState(initial?.shop_name ?? "SportShop");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [taxId, setTaxId] = useState(initial?.tax_id ?? "");
  const [bankInfo, setBankInfo] = useState(initial?.bank_info ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateShopInfo({
        shop_name: shopName,
        address: address || null,
        phone: phone || null,
        email: email || null,
        tax_id: taxId || null,
        bank_info: bankInfo || null,
      });
      if (result.ok) {
        toast({ title: "บันทึกข้อมูลร้านแล้ว ✅" });
      } else {
        toast({ title: "บันทึกไม่สำเร็จ", description: result.error, variant: "destructive" });
      }
    });
  }

  const hasBankInfo = (bankInfo ?? "").trim().length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="inline-flex items-center gap-2">
          <Store className="h-5 w-5 text-orange-400" /> ข้อมูลร้าน
          {!hasBankInfo && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-300">
              ⚠️ ยังไม่ตั้งบัญชี
            </Badge>
          )}
        </CardTitle>
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? "บันทึก..." : "บันทึก"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shop_name">ชื่อร้าน *</Label>
            <Input id="shop_name" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">เบอร์โทร</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081-234-5678" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="shop@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax_id">เลขผู้เสียภาษี</Label>
            <Input id="tax_id" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="0-0000-00000-00-0" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">ที่อยู่</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
          />
        </div>

        {/* Bank info — highlighted as important */}
        <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <Label htmlFor="bank_info" className="text-sm font-semibold text-emerald-300">
              ข้อมูลบัญชี / PromptPay
            </Label>
            <Badge className="bg-emerald-500/20 text-[10px] text-emerald-300">สำคัญ</Badge>
          </div>
          <Textarea
            id="bank_info"
            value={bankInfo}
            onChange={(e) => setBankInfo(e.target.value)}
            rows={8}
            placeholder={BANK_INFO_PLACEHOLDER}
            className="font-mono text-sm"
          />
          <div className="mt-2 rounded-md border border-emerald-500/30 bg-card/40 p-2.5 text-xs text-muted-foreground">
            <Info className="mr-1 inline h-3 w-3 text-emerald-400" />
            <strong className="text-emerald-300">ใช้ที่ไหนบ้าง:</strong>
            <ul className="mt-1 ml-4 list-disc space-y-0.5">
              <li>ปุ่ม <strong>"แจ้งขอชำระเงิน"</strong> ในแต่ละ JOB → tab การเงิน</li>
              <li>หน้า <strong>ใบเสนอราคา/Invoice</strong> (เปิดจากไอคอน 📄 ใน JOB detail)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
