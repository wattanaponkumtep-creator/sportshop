"use client";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose, Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/jobs": "งาน / JOBs",
  "/jobs/new": "เปิด JOB ใหม่",
  "/customers": "ลูกค้า",
  "/customers/new": "เพิ่มลูกค้า",
  "/factories": "โรงงาน",
  "/reports": "รายงาน",
  "/settings": "ตั้งค่า",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Match dynamic routes
  if (pathname.startsWith("/jobs/") && pathname !== "/jobs/new") return "รายละเอียดงาน";
  if (pathname.startsWith("/customers/") && pathname !== "/customers/new") return "ข้อมูลลูกค้า";
  return "SportShop";
}

export function Topbar() {
  const { collapsed, toggle, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-md md:px-5">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        aria-label="เปิดเมนู"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar toggle */}
      <button
        type="button"
        onClick={toggle}
        className="hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:block"
        aria-label={collapsed ? "ขยาย sidebar" : "พับ sidebar"}
        title={collapsed ? "ขยาย sidebar" : "พับ sidebar"}
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <h2 className="truncate text-base font-semibold md:text-lg">{title}</h2>
    </header>
  );
}
