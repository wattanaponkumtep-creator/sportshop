import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { R2Migrate } from "@/components/admin/r2-migrate";

export const dynamic = "force-dynamic";

export default function MigrateR2Page() {
  return (
    <div className="container max-w-2xl space-y-6 p-3 sm:p-4 md:p-8">
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> ตั้งค่า
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">ย้ายรูปไป Cloudflare R2</h1>
        <p className="mt-1 text-sm text-muted-foreground">ทำครั้งเดียว — ย้ายรูปเดิมทั้งหมดไป R2 เพื่อแก้ปัญหา egress เต็ม</p>
      </header>
      <R2Migrate />
    </div>
  );
}
