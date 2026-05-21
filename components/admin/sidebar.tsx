"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, Factory, LogOut, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "งาน / JOBs", icon: Briefcase },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/factories", label: "โรงงาน", icon: Factory },
];

export function Sidebar({ user }: { user: { name: string | null; email: string; avatar_url: string | null; role: string } }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 md:flex md:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg sport-accent-gradient">
          <Shirt className="h-5 w-5 text-white" />
        </div>
        <div className="font-display text-lg font-bold tracking-tight">SportShop</div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">
              {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
            <div className="truncate text-xs text-muted-foreground">{user.role}</div>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> ออกจากระบบ
          </button>
        </form>
      </div>
    </aside>
  );
}
