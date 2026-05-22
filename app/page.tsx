import Link from "next/link";
import {
  Shirt,
  Users,
  Briefcase,
  Factory,
  MessageSquare,
  Palette,
  Wallet,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Smartphone,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Features />
      <Workflow />
      <Benefits />
      <CTA />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg sport-accent-gradient">
            <Shirt className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">SportShop</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">ฟีเจอร์</a>
          <a href="#workflow" className="text-sm text-muted-foreground transition hover:text-foreground">วิธีใช้</a>
          <a href="#benefits" className="text-sm text-muted-foreground transition hover:text-foreground">ทำไมต้องใช้</a>
        </nav>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          เข้าสู่ระบบ <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute -bottom-40 left-0 h-[500px] w-[500px] rounded-full bg-red-500/15 blur-[120px]" />
      </div>

      <div className="container px-3 py-16 sm:px-4 sm:py-24 md:py-32">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            ระบบจัดการร้านเสื้อกีฬาครบวงจร
          </div>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            จัดการ <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">ร้านเสื้อกีฬา</span>
            <br />
            ของคุณให้เป็นมืออาชีพ
          </h1>

          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            ระบบเดียวที่รวมทุกอย่างไว้ในที่เดียว — ลูกค้า, ออเดอร์, โรงงาน, ไฟล์งาน, การเงิน
            และส่งแจ้งเตือนผ่าน LINE อัตโนมัติ
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              เริ่มใช้งานฟรี <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-6 py-3 text-sm font-semibold transition hover:bg-card"
            >
              ดูฟีเจอร์ทั้งหมด
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs text-muted-foreground sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> ใช้งานได้ทุกที่ ทุกอุปกรณ์
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> ไม่ต้องติดตั้งโปรแกรม
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> รองรับภาษาไทย 100%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4 border-t border-border/60 pt-8">
          <StatItem number="9+" label="ฟีเจอร์ครบ" />
          <StatItem number="24/7" label="ใช้งานได้ตลอด" />
          <StatItem number="100%" label="ภาษาไทย" />
        </div>
      </div>
    </section>
  );
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
        {number}
      </div>
      <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Users,
    title: "ระบบลูกค้า (CRM)",
    desc: "รวมลูกค้าจากทุกช่องทาง LINE, Facebook, โทรศัพท์ ไว้ในที่เดียว ไม่หลุดสักรายชื่อ",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Briefcase,
    title: "จัดการ JOB / ออเดอร์",
    desc: "เปิด JOB ใหม่ในไม่กี่วินาที พร้อม JOB ID อัตโนมัติ ติดตามได้ทุกขั้นตอน",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Palette,
    title: "Mockup Approval",
    desc: "ลูกค้ากดอนุมัติแบบเสื้อผ่านลิงก์ — ไม่ต้องแชทกลับไปกลับมา",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Factory,
    title: "ระบบโรงงาน Outsource",
    desc: "จัดการโรงงานหลายแห่ง ติดตามสถานะการผลิตแยกแต่ละงาน",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: MessageSquare,
    title: "LINE Auto-notify",
    desc: "ลูกค้าได้รับ LINE อัตโนมัติทุกครั้งที่งานเปลี่ยนสถานะ ไม่ต้องตอบเอง",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Wallet,
    title: "ระบบการเงิน",
    desc: "บันทึกมัดจำ-ชำระเต็ม แนบสลิป คำนวณยอดคงเหลือ ดูกำไรรายเดือน",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: BarChart3,
    title: "Reports / Analytics",
    desc: "ดู Top ลูกค้า, โรงงานที่ใช้บ่อย, ยอดขายย้อนหลัง 6 เดือน",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Zap,
    title: "Kanban Realtime",
    desc: "ลากการ์ดเพื่อเปลี่ยนสถานะ — sync ทุกอุปกรณ์ทันที",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Smartphone,
    title: "ใช้บนมือถือได้เต็มที่",
    desc: "ออกแบบ Mobile-first ใช้บน iPhone, iPad, Android สะดวกเหมือนคอม",
    color: "from-rose-500 to-red-500",
  },
];

function Features() {
  return (
    <section id="features" className="border-t border-border/60 py-16 sm:py-24">
      <div className="container px-3 sm:px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">ฟีเจอร์</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            ทุกอย่างที่ร้านคุณต้องใช้
          </h2>
          <p className="mt-4 text-muted-foreground">
            ออกแบบมาเฉพาะสำหรับร้านรับผลิตเสื้อกีฬาที่ใช้โรงงาน Outsource
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-xl border border-border bg-card/40 p-6 transition hover:border-primary/40 hover:bg-card"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${f.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    num: "01",
    title: "รับงานลูกค้า",
    desc: "ลูกค้าทักมาช่องไหนก็ได้ — บันทึกข้อมูลในระบบครั้งเดียว เปิด JOB ใหม่ใช้เวลาไม่กี่วินาที",
  },
  {
    num: "02",
    title: "ออกแบบ + ลูกค้าอนุมัติ",
    desc: "อัปโหลด mockup → ส่งลิงก์ให้ลูกค้ากดอนุมัติ → ระบบบันทึก decision ให้อัตโนมัติ",
  },
  {
    num: "03",
    title: "ส่งโรงงาน + ติดตาม",
    desc: "เลือกโรงงาน เปลี่ยนสถานะตามขั้นตอน → ลูกค้าได้ LINE update ทุกครั้ง",
  },
  {
    num: "04",
    title: "ส่งของ + ปิดงาน",
    desc: "ใส่เลข tracking → ลูกค้าเห็นทันที → สรุปกำไรเข้า Reports อัตโนมัติ",
  },
];

function Workflow() {
  return (
    <section id="workflow" className="border-t border-border/60 bg-card/20 py-16 sm:py-24">
      <div className="container px-3 sm:px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">วิธีใช้</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            จัดการงานง่ายใน 4 ขั้นตอน
          </h2>
          <p className="mt-4 text-muted-foreground">
            จากรับงานถึงปิดงาน — ทำซ้ำได้ทุกออเดอร์
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.num} className="relative">
              <div className="rounded-xl border border-border bg-card/40 p-6">
                <div className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-4xl font-bold text-transparent">
                  {s.num}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 lg:block">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const BENEFITS = [
  "เปิด JOB ใหม่ในไม่กี่วินาที — ไม่ต้องจดในกระดาษ/Excel",
  "ลูกค้าได้ update สถานะอัตโนมัติ — ลดการตอบ chat ซ้ำ ๆ",
  "Mockup approval ผ่านลิงก์ — ลด workflow ทาง chat",
  "เห็นยอดขาย/กำไร/ค้างชำระทันที — วางแผนการเงินง่ายขึ้น",
  "ใช้ได้บนมือถือ — รับงานนอกร้านได้",
  "ทีมงานหลายคนใช้พร้อมกัน — ทุกคนเห็นข้อมูลล่าสุด",
  "Data ปลอดภัย backup อัตโนมัติ — ไม่หายแน่นอน",
  "ฟรี ใช้ได้ทันที — ไม่มีค่าใช้จ่ายรายเดือน",
];

function Benefits() {
  return (
    <section id="benefits" className="border-t border-border/60 py-16 sm:py-24">
      <div className="container px-3 sm:px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">ทำไมต้องใช้</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              ระบบที่ออกแบบมาเพื่อ
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                ร้านเสื้อกีฬาโดยเฉพาะ
              </span>
            </h2>
            <p className="text-muted-foreground">
              ไม่ใช่ระบบจัดการทั่ว ๆ ไป — เราเข้าใจ workflow ของร้านที่ใช้โรงงาน outsource
              ตั้งแต่รับงาน ออกแบบ ส่งโรงงาน QC จนถึงส่งลูกค้า
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              ลองใช้ฟรีตอนนี้ <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 rounded-lg border border-border bg-card/40 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t border-border/60 py-16 sm:py-24">
      <div className="container px-3 sm:px-4">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8 text-center sm:p-12">
          <div className="absolute inset-0 -z-10 sport-accent-gradient opacity-10" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl sport-accent-gradient">
            <Shirt className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            พร้อมเปลี่ยนวิธีจัดการร้านของคุณ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            เริ่มใช้ฟรีตอนนี้ — ไม่ต้องผูกบัตรเครดิต ใช้งานได้ครบทุกฟีเจอร์
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              เข้าสู่ระบบ <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="container flex flex-col items-center justify-between gap-4 px-3 sm:flex-row sm:px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md sport-accent-gradient">
            <Shirt className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">SportShop</span>
          <span className="text-xs text-muted-foreground">© 2026</span>
        </div>
        <div className="text-xs text-muted-foreground">
          ระบบจัดการร้านเสื้อกีฬาพิมพ์ลาย
        </div>
      </div>
    </footer>
  );
}
