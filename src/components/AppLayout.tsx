import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, AlertTriangle, BarChart3, Settings, Wrench, Menu, X } from "lucide-react";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useParts } from "@/hooks/use-parts";
import { partStatus } from "@/lib/parts";
import { cn } from "@/lib/utils";

type NavItem = { to: "/dashboard" | "/inventory" | "/alerts" | "/reports" | "/settings"; label: string; icon: typeof LayoutDashboard; exact?: boolean; alert?: boolean };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/alerts", label: "Low Stock Alerts", icon: AlertTriangle, alert: true },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { parts } = useParts();
  const alertCount = parts.filter((p) => partStatus(p) !== "in").length;

  // Pages without app chrome (sidebar): landing + auth
  const isPublic = path === "/" || path.startsWith("/auth");
  if (isPublic) {
    return (
      <>
        <Outlet />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen flex blueprint-bg text-foreground">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 bg-sidebar/90 backdrop-blur border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md gradient-primary grid place-items-center shadow-glow">
            <Wrench className="size-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">PartsPro</span>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="p-2 rounded-md hover:bg-sidebar-accent">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky md:top-0 z-20 inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border h-screen flex-col transition-transform duration-300",
          "flex",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="hidden md:flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
          <div className="size-9 rounded-lg gradient-primary grid place-items-center shadow-glow">
            <Wrench className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-xl tracking-tight">PartsPro</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-widest">Inventory</div>
          </div>
        </div>

        <nav className="flex-1 p-3 mt-14 md:mt-0 space-y-1">
          {NAV.map((item) => {
            const isActive = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full gradient-primary" />
                )}
                <Icon className="size-4.5" />
                <span className="flex-1">{item.label}</span>
                {item.alert && alertCount > 0 && (
                  <span className="relative flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground pulse-dot">
                    {alertCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 text-xs text-muted-foreground border-t border-sidebar-border">
          <div className="font-display tracking-wide">v1.0 · Built fast</div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-10 bg-background/70 md:hidden" onClick={() => setOpen(false)} />
      )}

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-up">
          <Outlet />
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}
