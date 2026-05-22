import { Card, CardContent } from "@/components/ui/card";
import { TemplateCard } from "@/components/templates/template-card";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

type Template = {
  id: string;
  channel: "line" | "facebook" | "phone" | "all";
  channelLabel: string;
  title: string;
  text: string;
};

const TEMPLATES: Template[] = [
  {
    id: "greet_new",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "ทักทายลูกค้าใหม่",
    text: `สวัสดีครับ ขอบคุณที่สนใจ SportShop 🎽
สั่งทำเสื้อกีฬาพิมพ์ลายตามแบบ — มีบริการครบวงจร

📋 ขอข้อมูลเบื้องต้นนะครับ:
• จำนวนเสื้อกี่ตัว?
• ทีมหรือทำใส่เอง?
• กำหนดต้องการใช้วันที่?

แนบรูปแบบที่อยากได้/อ้างอิงก็ได้นะครับ จะประเมินราคาให้`,
  },
  {
    id: "quote_request",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "ขอข้อมูลก่อนเสนอราคา",
    text: `เพื่อให้ประเมินราคาแม่นยำ ขอข้อมูลเพิ่มเติม:

🎽 ประเภทเสื้อ: คอกลม / โปโล / แขนยาว
🔢 จำนวน + ตารางไซส์ (S, M, L, XL = กี่ตัว?)
🎨 จำนวนสี/เทคนิคพิมพ์ (ซับลิเมชั่น/Silk Screen)
📝 มีโลโก้ Sponsor กี่จุด?
📅 ใช้วันที่เท่าไหร่`,
  },
  {
    id: "mockup_send",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "ส่ง Mockup ให้ลูกค้าอนุมัติ",
    text: `แบบเสื้อ Mockup ของคุณเรียบร้อยครับ ✨

กดลิงก์ดูแบบ + อนุมัติ:
{APPROVE_URL}

หากต้องการแก้ไขส่วนไหน ระบบมีช่องให้ใส่หมายเหตุได้เลย
ทางร้านจะรอตอบกลับนะครับ 🙏`,
  },
  {
    id: "deposit_request",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "ขอมัดจำ",
    text: `เพื่อยืนยันออเดอร์ รบกวนชำระมัดจำ 50% ก่อนเริ่มผลิตนะครับ

💳 บัญชี: {BANK_INFO}
จำนวนมัดจำ: {DEPOSIT_AMOUNT} บาท

✅ ส่งสลิปกลับมาทาง chat นี้ได้เลย
หลังได้สลิป เริ่มดำเนินการทันที`,
  },
  {
    id: "in_production",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "อัปเดต: เข้าโรงงานแล้ว",
    text: `อัปเดตงาน {JOB_CODE} 📦

✅ ได้ส่งงานเข้าโรงงานเรียบร้อย
⏱ ใช้เวลาผลิต 7-14 วันทำการ
🔗 ติดตามสถานะได้ที่: {TRACK_URL}

จะแจ้งความคืบหน้าต่อเนื่องครับ`,
  },
  {
    id: "ready_to_ship",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "พร้อมจัดส่ง",
    text: `งาน {JOB_CODE} ผลิตเสร็จแล้ว พร้อมจัดส่ง 🎉

ขอรบกวนยอดเงินส่วนที่เหลือก่อนส่งของนะครับ
💰 ยอดคงเหลือ: {OUTSTANDING} บาท

📍 ที่อยู่จัดส่ง: รบกวนยืนยันที่อยู่+เบอร์โทรอีกครั้ง
หลังโอนแล้วส่งสลิปกลับมา จะส่งของในวันถัดไป`,
  },
  {
    id: "shipped",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "จัดส่งแล้ว + Tracking",
    text: `จัดส่งแล้ว ✈️

🚚 บริษัทขนส่ง: {CARRIER}
📦 เลข Tracking: {TRACKING_NO}

🔗 เช็คสถานะการจัดส่ง: {TRACK_URL}

ของถึงเรียบร้อยรบกวนตอบกลับด้วยนะครับ ขอบคุณที่ใช้บริการ 🙏`,
  },
  {
    id: "follow_up_overdue",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "ตามยอดค้างชำระ",
    text: `สวัสดีครับ ขอติดตามยอดค้างชำระงาน {JOB_CODE}

💰 ยอดคงค้าง: {OUTSTANDING} บาท
📅 กำหนดส่งเดิม: {DUE_DATE}

หากชำระเรียบร้อยแล้ว รบกวนส่งสลิปกลับมาให้หน่อยนะครับ
ถ้ามีปัญหาอะไรแจ้งทางร้านได้ตลอด`,
  },
  {
    id: "follow_up_quote",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "ติดตามใบเสนอราคา",
    text: `สวัสดีครับ ทักมาตามความคืบหน้าจากใบเสนอราคาเดิม

ถ้าสนใจ มีคำถามอะไรเพิ่มเติม ทักมาคุยกันได้ตลอดนะครับ
ทางร้านพร้อมปรับ spec ให้เหมาะกับงบประมาณ + กำหนดเวลาที่ต้องการ 🙏`,
  },
  {
    id: "thanks_complete",
    channel: "all",
    channelLabel: "ทุกช่อง",
    title: "ขอบคุณหลังปิดงาน",
    text: `งาน {JOB_CODE} ปิดเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ SportShop ครับ 🙏

ถ้าพอใจในงาน รบกวนรีวิวให้ทางร้านสักหน่อย
มีงานครั้งถัดไป ทักมาได้ตลอดนะครับ ลูกค้าเก่าได้ส่วนลด 5% ทุกออเดอร์`,
  },
];

export default function TemplatesPage() {
  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-orange-400">ข้อความสำเร็จรูป</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight md:text-3xl">
          <MessageSquare className="mr-2 inline-block h-7 w-7 text-orange-400" />
          Templates
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ข้อความสำเร็จรูปสำหรับตอบ chat — คลิก &quot;Copy&quot; แล้วไปวางใน LINE/FB
        </p>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-3 text-xs">
            <p className="font-semibold text-orange-400">💡 Tip</p>
            <p className="mt-1 text-muted-foreground">
              ข้อความมี <code className="rounded bg-muted px-1">{"{TOKEN}"}</code> เช่น <code>{"{JOB_CODE}"}</code> — เปลี่ยนเป็นค่าจริงก่อนส่ง
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    </div>
  );
}
