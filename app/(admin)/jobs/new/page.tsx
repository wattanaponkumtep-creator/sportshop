import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/jobs/job-form";

export const dynamic = "force-dynamic";

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer: preselectedCustomerId } = await searchParams;
  const supabase = await createClient();

  const [{ data: customers }, { data: factories }] = await Promise.all([
    supabase.from("customers").select("id, name").order("created_at", { ascending: false }).limit(500),
    supabase.from("factories").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="container max-w-4xl space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-8">
      <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> งานทั้งหมด
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">เปิด JOB ใหม่</h1>
        <p className="text-sm text-muted-foreground">JOB ID จะถูกสร้างอัตโนมัติ (เช่น SP260001)</p>
      </header>
      <JobForm
        customers={customers ?? []}
        factories={factories ?? []}
        preselectedCustomerId={preselectedCustomerId}
      />
    </div>
  );
}
