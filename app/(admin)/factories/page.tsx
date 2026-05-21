import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { FactoriesView } from "@/components/factories/factories-view";

export const dynamic = "force-dynamic";

export default async function FactoriesPage() {
  const supabase = await createClient();
  const { data: factories } = await supabase
    .from("factories")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name");

  return (
    <div className="container space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">โรงงาน</h1>
        <p className="text-sm text-muted-foreground">จัดการโรงงาน Outsource ที่ใช้ผลิตเสื้อ</p>
      </header>

      <Card>
        <CardContent className="p-0">
          <FactoriesView initialFactories={factories ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
