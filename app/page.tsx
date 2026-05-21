import Link from "next/link";
import { Shirt, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen sport-gradient">
      <div className="container flex min-h-screen flex-col items-center justify-center gap-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl sport-accent-gradient">
          <Shirt className="h-10 w-10 text-white" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">SportShop</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            ระบบจัดการร้านเสื้อกีฬาพิมพ์ลาย — รวมลูกค้า จัดการออเดอร์ ติดตามโรงงาน ครบจบในที่เดียว
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            เข้าสู่ระบบ <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
