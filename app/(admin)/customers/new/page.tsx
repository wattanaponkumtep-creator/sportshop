import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="container max-w-3xl space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> กลับไปที่รายชื่อลูกค้า
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">เพิ่มลูกค้าใหม่</h1>
        <p className="text-sm text-muted-foreground">เก็บข้อมูลลูกค้าและช่องทางติดต่อทั้งหมดในที่เดียว</p>
      </header>
      <CustomerForm />
    </div>
  );
}
