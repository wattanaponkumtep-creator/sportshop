"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Store, Save, Loader2, Wallet, Info, Truck } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { updateShopInfo } from "@/app/(admin)/settings/actions";
import { formatBaht } from "@/lib/utils";

type ShopInfo = {
  shop_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  bank_info: string | null;
  charge_customer_shipping?: boolean;
  free_ship_min_qty?: number;
  customer_ship_fee?: number;
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
  const [chargeShip, setChargeShip] = useState(initial?.charge_customer_shipping ?? false);
  const [minQty, setMinQty] = useState(String(initial?.free_ship_min_qty ?? 50));
  const [shipMode, setShipMode] = useState<"actual" | "fixed">(
    (initial?.customer_ship_fee ?? 0) > 0 ? "fixed" : "actual",
  );
  const [shipFee, setShipFee] = useState(String(initial?.customer_ship_fee ?? 0));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    // ตามจริง → เก็บค่าส่ง = 0 (ไม่ล็อกตัวเลข) · ตายตัว → เก็บตามที่กรอก
    const feeToSave = shipMode === "fixed" ? Math.max(0, Number(shipFee) || 0) : 0;
    startTransition(async () => {
      const result = await updateShopInfo({
        shop_name: shopName,
        address: address || null,
        phone: phone || null,
        email: email || null,
        tax_id: taxId || null,
        bank_info: bankInfo || null,
        charge_customer_shipping: chargeShip,
        free_ship_min_qty: Math.max(1, Number(minQty) || 50),
        customer_ship_fee: feeToSave,
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
              <li>ปุ่ม <strong>&quot;แจ้งขอชำระเงิน&quot;</strong> ในแต่ละ JOB → tab การเงิน</li>
              <li>หน้า <strong>ใบเสนอราคา/Invoice</strong> (เปิดจากไอคอน 📄 ใน JOB detail)</li>
            </ul>
          </div>
        </div>

        {/* นโยบายค่าส่งลูกค้า */}
        <div className="rounded-lg border-2 border-cyan-500/30 bg-cyan-500/5 p-3">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={chargeShip}
              onChange={(e) => setChargeShip(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-500"
            />
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
                <Truck className="h-4 w-4" /> คิดค่าส่งกับลูกค้า (ออเดอร์เล็ก)
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                สั่งน้อยกว่าเกณฑ์ → บวกค่าส่งเข้าบิลอัตโนมัติ + แจ้งลูกค้า · ตั้งแต่เกณฑ์ขึ้นไป = ส่งฟรี
              </p>
            </div>
          </label>

          {chargeShip && (
            <div className="mt-3 space-y-3 border-t border-cyan-500/20 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">ส่งฟรีเมื่อสั่งตั้งแต่ (ตัว)</Label>
                <Input type="number" min="1" value={minQty} onChange={(e) => setMinQty(e.target.value)} className="h-9 w-28" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">คิดค่าส่งแบบ</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShipMode("actual")}
                    className={`rounded-md border-2 px-3 py-1.5 text-xs transition ${shipMode === "actual" ? "border-cyan-400 bg-cyan-500/15 font-medium" : "border-border text-muted-foreground hover:border-cyan-400/40"}`}
                  >
                    📍 ตามจริง (แจ้งลูกค้าภายหลัง)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipMode("fixed")}
                    className={`rounded-md border-2 px-3 py-1.5 text-xs transition ${shipMode === "fixed" ? "border-cyan-400 bg-cyan-500/15 font-medium" : "border-border text-muted-foreground hover:border-cyan-400/40"}`}
                  >
                    🏷️ ตายตัว (ระบุจำนวน)
                  </button>
                </div>
              </div>

              {shipMode === "fixed" && (
                <div className="space-y-1">
                  <Label className="text-xs">ค่าส่ง (บาท)</Label>
                  <Input type="number" min="0" value={shipFee} onChange={(e) => setShipFee(e.target.value)} className="h-9 w-28" />
                </div>
              )}

              <div className="rounded-md border border-cyan-500/30 bg-card/40 p-2 text-[11px] text-muted-foreground">
                📦 สั่ง <strong className="text-foreground">1–{(Number(minQty) || 50) - 1}</strong> ตัว คิดค่าส่ง{" "}
                {shipMode === "fixed" ? (
                  <strong className="text-cyan-300">{formatBaht(Number(shipFee) || 0)}</strong>
                ) : (
                  <strong className="text-cyan-300">ตามจริง (ตามระยะทาง/ขนส่ง)</strong>
                )}{" "}
                · <strong className="text-foreground">{Number(minQty) || 50}+</strong> ตัว ส่งฟรี
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
