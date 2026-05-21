"use client";
import { SidebarProvider } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

type Props = {
  user: { name: string | null; email: string; avatar_url: string | null; role: string };
  children: React.ReactNode;
};

export function AdminShell({ user, children }: Props) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
