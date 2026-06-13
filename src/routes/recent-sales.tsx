import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import {
  Database, RefreshCw, AlertTriangle, Wrench, ShoppingCart,
  LogOut, Sun, Moon,
} from "lucide-react";
import { useSales } from "@/hooks/use-sales";
import type { Transaction } from "@/hooks/use-sales";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme-context";
import { toast } from "sonner";

export const Route = createFileRoute("/recent-sales")({
  head: () => ({ meta: [{ title: "Recent Sales — PartsPro" }] }),
  ssr: false,
  component: RecentSales,
});

function RecentSales() {
  const navigate = useNavigate();
  const { sales, loading, error } = useSales();
  const { theme, toggleTheme } = useTheme();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [cashierEmail, setCashierEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserRole(data.user.user_metadata?.role || "admin");
        setCashierEmail(data.user.email || "Cashier Terminal");
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate({ to: "/auth", replace: true } as any);
  };

  const defaultEnd = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  // Client-side date-range filter
  const filteredTxs = useMemo(() => {
    try {
      const s = new Date(`${startDate}T00:00:00`);
      const e = new Date(`${endDate}T23:59:59.999`);
      return sales.filter((t) => {
        const d = new Date(t.date);
        return d >= s && d <= e;
      });
    } catch {
      return sales;
    }
  }, [sales, startDate, endDate]);

  const totals = useMemo(() => {
    const result = { transactions: filteredTxs.length, revenue: 0, tax: 0, subtotal: 0, itemsSold: 0 };
    for (const t of filteredTxs) {
      result.revenue += t.total || 0;
      result.tax += t.tax || 0;
      result.subtotal += t.subtotal || 0;
      for (const it of t.items) result.itemsSold += it.quantity || 0;
    }
    return result;
  }, [filteredTxs]);

  const flattened = useMemo(() => {
    const rows: {
      ts: string;
      time: string;
      sku: string;
      name: string;
      qty: number;
      price: number;
      subtotal: number;
      txId: string;
      cashier: string;
    }[] = [];
    for (const t of filteredTxs) {
      const time = format(new Date(t.date), "HH:mm:ss");
      const ts = new Date(t.date).toISOString();
      for (const it of t.items) {
        rows.push({
          ts,
          time,
          sku: it.sku,
          name: it.name,
          qty: it.quantity,
          price: it.price,
          subtotal: it.price * it.quantity,
          txId: t.id,
          cashier: t.cashier,
        });
      }
    }
    return rows.sort((a, b) => b.ts.localeCompare(a.ts));
  }, [filteredTxs]);

  // If the user is an admin, render without the cashier sidebar (they have the AppLayout sidebar)
  if (userRole === "admin" || userRole === null) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>← Back to Dashboard</span>
            </Link>
          </div>
          {renderContent()}
        </div>
      </div>
    );
  }

  // Cashier layout with sidebar
  return (
    <div className={cn(
      "min-h-screen flex flex-col sm:flex-row font-sans transition-colors duration-300 blueprint-bg",
      "text-foreground"
    )}>
      {/* Mobile Header */}
      <header className={cn(
        "sm:hidden h-16 sticky top-0 z-10 flex items-center justify-between px-4 border-b transition-colors duration-300 bg-sidebar border-sidebar-border text-sidebar-foreground",
        theme === "dark" ? "" : "shadow-sm"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg gradient-primary grid place-items-center shadow-glow">
              <Wrench className="size-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none justify-center">
              <div className="font-bold text-base text-sidebar-foreground">PartsPro</div>
              <div className="text-[8px] text-primary font-bold tracking-widest uppercase mt-0.5">Cashier</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={cn(
              "relative size-8 rounded-xl border flex items-center justify-center transition-all duration-300 border-sidebar-border bg-sidebar hover:bg-sidebar-accent/60 text-sidebar-foreground"
            )}
          >
            <span className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300",
              theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"
            )}>
              <Moon className="size-3.5" />
            </span>
            <span className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300",
              theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
            )}>
              <Sun className="size-3.5" />
            </span>
          </button>

          <button
            onClick={handleSignOut}
            className={cn(
              "size-8 rounded-xl border flex items-center justify-center transition border-sidebar-border bg-sidebar hover:bg-sidebar-accent/60 text-sidebar-foreground"
            )}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden sm:flex flex-col w-64 border-r transition-colors duration-300 bg-sidebar border-sidebar-border sticky top-0 h-screen overflow-y-auto",
        theme === "dark" ? "" : "shadow-sm"
      )}>
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg gradient-primary grid place-items-center shadow-glow">
              <Wrench className="size-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none justify-center">
              <div className="font-bold text-lg text-sidebar-foreground">PartsPro</div>
              <div className="text-[9px] text-primary font-bold tracking-widest uppercase mt-0.5">Cashier</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-sidebar-foreground mb-1 break-words">{cashierEmail}</div>
            <div className="text-xs text-sidebar-foreground/75">Live sales terminal</div>
          </div>

          {/* Point of Sale / Back to Terminal */}
          <div
            onClick={() => navigate({ to: "/cashier" })}
            className="flex flex-col gap-3 cursor-pointer hover:bg-sidebar-accent/60 p-2 rounded-lg transition"
          >
            <h3 className={cn("font-bold flex items-center gap-2 text-sm text-sidebar-foreground flex-wrap")}>
              <ShoppingCart className="size-4 text-primary" /> Point of Sale
            </h3>
            <div className="flex flex-col text-sidebar-foreground/75 text-sm">
              <div className="py-2 text-center text-sidebar-foreground/60 text-xs">
                Go back to the terminal
              </div>
            </div>
          </div>

          {/* Recent Sales Section (active) */}
          <div
            className="flex flex-col gap-3 bg-sidebar-accent p-2 rounded-lg transition"
          >
            <h3 className={cn("font-bold flex items-center gap-2 text-sm text-sidebar-accent-foreground flex-wrap")}>
              <Database className="size-4 text-primary" /> Recent sales
            </h3>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={cn(
                "relative w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-3 flex-wrap transition-all duration-300 border-sidebar-border bg-sidebar hover:bg-sidebar-accent/60 text-sidebar-foreground"
              )}
            >
              <span className={cn(
                "transition-all duration-300",
                theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50 absolute"
              )}>
                <Moon className="size-4" />
              </span>
              <span className={cn(
                "transition-all duration-300",
                theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
              )}>
                <Sun className="size-4" />
              </span>
              <span className="text-sm font-semibold">Toggle Theme</span>
            </button>

            <button
              onClick={handleSignOut}
              className={cn(
                "w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-3 flex-wrap transition text-sm font-semibold border-sidebar-border bg-sidebar hover:bg-sidebar-accent/60 text-sidebar-foreground"
              )}
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-[1600px] mx-auto w-full transition-colors duration-300">
        {renderContent()}
      </main>
    </div>
  );

  function renderContent() {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg gradient-primary grid place-items-center shadow-glow">
            <Database className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Recent Sales</h1>
            <p className="text-sm text-muted-foreground">View your sales history</p>
          </div>
        </div>

        {/* DB error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            <AlertTriangle className="size-4 mt-0.5 shrink-0 text-yellow-400" />
            <div>
              <strong className="font-semibold">Reports fallback:</strong> Could not load sales
              from the database ({error}). Showing local cache instead.
            </div>
          </div>
        )}

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border shadow-card animate-pulse">
                <div className="h-3 w-24 bg-muted rounded mb-3" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-card border border-border shadow-card hover:border-primary/40 transition">
              <div className="text-xs text-muted-foreground">Transactions</div>
              <div className="font-display text-2xl font-bold mt-2">{totals.transactions}</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-card hover:border-primary/40 transition">
              <div className="text-xs text-muted-foreground">Items Sold</div>
              <div className="font-display text-2xl font-bold mt-2">{totals.itemsSold}</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-card hover:border-primary/40 transition">
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="font-display text-2xl font-bold mt-2">${totals.revenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">
                Subtotal ${totals.subtotal.toFixed(2)} &bull; Tax ${totals.tax.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Date range selector */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-card border border-border px-2 py-1 rounded"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-card border border-border px-2 py-1 rounded"
            />
          </div>
        </div>

        {/* Transaction table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground text-sm">
              <RefreshCw className="size-5 animate-spin" />
              Loading sales from database…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Time</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">SKU</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Qty</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Price</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Cashier</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Tx ID</th>
                  </tr>
                </thead>
                <tbody>
                  {flattened.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                        No sales recorded in the selected date range.
                      </td>
                    </tr>
                  ) : (
                    flattened.map((r, i) => (
                      <tr key={`${r.txId}-${i}`} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground tabular-nums hidden sm:table-cell">
                          {format(new Date(r.ts), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3 tabular-nums hidden sm:table-cell">{r.time}</td>
                        <td className="px-4 py-3 font-medium">{r.name}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">{r.sku}</td>
                        <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">{r.qty}</td>
                        <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">${r.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          ${r.subtotal.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[140px] hidden lg:table-cell">
                          {r.cashier}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono hidden lg:table-cell">
                          {r.txId.slice(0, 8)}…
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }
}
