import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { DesignForm } from "@/components/designs/design-form";

export const dynamic = "force-dynamic";

export default function NewDesignPage() {
  return (
    <div className="container space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href="/designs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> คลังดีไซน์
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Plus className="h-7 w-7 text-orange-400" /> เพิ่มดีไซน์ใหม่
        </h1>
        <p className="text-sm text-muted-foreground">อัปโหลดรูปแบบเสื้อ + ตั้งค่าข้อมูลเพื่อใช้ในงานต่อๆ ไป</p>
      </header>

      <DesignForm />
    </div>
  );
}
