"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, Factory, LogOut, Shirt, BarChart3, Settings, X, MessageSquare, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "งาน / JOBs", icon: Briefcase },
  { href: "/designs", label: "คลังดีไซน์", icon: Palette },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/factories", label: "โรงงาน", icon: Factory },
  { href: "/templates", label: "ข้อความ", icon: MessageSquare },
  { href: "/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

type Props = {
  user: { name: string | null; email: string; avatar_url: string | null; role: string };
};

export function Sidebar({ user }: Props) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="ปิดเมนู"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-200",
          "md:sticky md:top-0 md:z-30 md:h-screen md:bg-card/40",
          // Width
          collapsed ? "md:w-16" : "md:w-60",
          // Mobile: slide in/out
          mobileOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-14 shrink-0 items-center border-b border-border", collapsed ? "justify-center px-2" : "gap-3 px-5")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sport-accent-gradient">
            <Shirt className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="font-display text-base font-bold tracking-tight">SportShop</div>
          )}
          {/* Close button (mobile only) */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className={cn("shrink-0 border-t border-border", collapsed ? "p-2" : "p-3")}>
          <div className={cn("mb-2 flex items-center", collapsed ? "justify-center" : "gap-3 px-1")}>
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
                <div className="truncate text-xs text-muted-foreground">{user.role}</div>
              </div>
            )}
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title={collapsed ? "ออกจากระบบ" : undefined}
              className={cn(
                "inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
                collapsed && "justify-center px-0"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && "ออกจากระบบ"}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
