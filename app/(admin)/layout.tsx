import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { RealtimeRefresh } from "@/components/admin/realtime-refresh";
import { getFollowupSuggestions } from "@/lib/suggestions/followup";

// Subscribe เฉพาะตารางหลักที่เปลี่ยนบ่อย + สำคัญ (ประหยัด egress)
// ตารางอื่นจะอัพเดทตอนกลับมาที่แท็บ (focus refresh) อยู่แล้ว
const REALTIME_TABLES = ["jobs", "payments"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, avatar_url, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    redirect("/login?error=not_active");
  }

  const suggestions = await getFollowupSuggestions();
  const alerts = suggestions.map((s) => ({
    job_id: s.job_id,
    job_code: s.job_code,
    customer_name: s.customer_name,
    reason: s.reason,
    level: s.level,
    detail: s.detail,
  }));

  return (
    <AdminShell user={profile} alerts={alerts}>
      <RealtimeRefresh channelName="admin-live" tables={REALTIME_TABLES} />
      {children}
    </AdminShell>
  );
}
