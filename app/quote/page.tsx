import { PublicHeader, PublicFooter } from "@/components/public/public-layout";
import { Sparkles, Clock, Shield, Award } from "lucide-react";
import { QuoteForm } from "./quote-form";

export const dynamic = "force-dynamic";

export default function QuotePage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-orange-500/15 via-background to-background py-12 sm:py-16">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              ขอใบเสนอราคาฟรี
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              กรอกฟอร์มสั้นๆ ทางร้านจะติดต่อกลับภายใน <strong className="text-foreground">24 ชม.</strong>
            </p>
          </div>
        </section>

        {/* 3 Benefits */}
        <section className="container mx-auto max-w-4xl px-4 pb-2">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Clock, title: "ตอบเร็ว", desc: "ภายใน 24 ชม." },
              { icon: Shield, title: "ฟรี", desc: "ไม่มีค่าใช้จ่าย" },
              { icon: Award, title: "ปรึกษาฟรี", desc: "แนะนำเนื้อผ้า + แบบ" },
            ].map((b) => (
              <div key={b.title} className="rounded-lg border border-border bg-card/40 p-3 text-center">
                <b.icon className="mx-auto h-5 w-5 text-orange-400" />
                <div className="mt-1.5 text-sm font-semibold">{b.title}</div>
                <div className="text-xs text-muted-foreground">{b.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
          <QuoteForm />
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
