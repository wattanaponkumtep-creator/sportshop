"use client";
import { SidebarProvider } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

type Alert = {
  job_id: string;
  job_code: string;
  customer_name: string;
  reason: string;
  level: "urgent" | "warning" | "info";
  detail: string;
};

type Props = {
  user: { name: string | null; email: string; avatar_url: string | null; role: string };
  alerts: Alert[];
  children: React.ReactNode;
};

export function AdminShell({ user, alerts, children }: Props) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar alerts={alerts} />
          <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
