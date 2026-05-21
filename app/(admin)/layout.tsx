import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/admin/sidebar";
import { MobileNav } from "@/components/admin/mobile-nav";

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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={profile} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
