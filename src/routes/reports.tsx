import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, subDays, addDays } from "date-fns";
import * as Recharts from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useSales } from "@/hooks/use-sales";
import type { Transaction } from "@/hooks/use-sales";
import { RefreshCw, AlertTriangle, Wifi } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — PartsPro" }] }),
  component: ReportsPage,
});

// ─── Histogram sub-component ─────────────────────────────────────────────────

function HistogramSection({
  txs,
  startStr,
  endStr,
  onStartChange,
  onEndChange,
}: {
  txs: Transaction[];
  startStr: string;
  endStr: string;
  onStartChange: (s: string) => void;
  onEndChange: (s: string) => void;
}) {
  const startDate = useMemo(() => new Date(`${startStr}T00:00:00`), [startStr]);
  const endDate = useMemo(() => new Date(`${endStr}T23:59:59.999`), [endStr]);

  const dayLabels = useMemo(() => {
    const labels: Date[] = [];
    let cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      labels.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return labels;
  }, [startDate, endDate]);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dayLabels) counts[format(d, "yyyy-MM-dd")] = 0;

    for (const tx of txs) {
      const tDate = new Date(tx.date);
      if (tDate >= startDate && tDate <= endDate) {
        const key = format(tDate, "yyyy-MM-dd");
        const qty = tx.items.reduce((s, it) => s + (it.quantity || 0), 0);
        counts[key] = (counts[key] || 0) + qty;
      }
    }

    return dayLabels.map((d) => ({
      day: format(d, "EEE dd/MM"),
      dateKey: format(d, "yyyy-MM-dd"),
      count: counts[format(d, "yyyy-MM-dd")] || 0,
    }));
  }, [txs, dayLabels, startDate, endDate]);

  const max = useMemo(() => data.reduce((m, r) => Math.max(m, r.count), 0), [data]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/40 transition">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Sales Histogram</div>
          <div className="font-semibold">Sells per day</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            value={startStr}
            onChange={(e) => onStartChange(e.target.value)}
            className="bg-card border border-border px-2 py-1 rounded"
          />
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            value={endStr}
            onChange={(e) => onEndChange(e.target.value)}
            className="bg-card border border-border px-2 py-1 rounded"
          />
        </div>
      </div>

      <ChartContainer
        config={{ sells: { label: "Sells", color: "var(--chart-5)" } }}
        className="w-full h-48"
      >
        <Recharts.ResponsiveContainer>
          <Recharts.ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <Recharts.XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)" }} />
            <Recharts.YAxis allowDecimals={false} domain={[0, Math.max(1, max)]} />
            <Recharts.Tooltip content={<ChartTooltipContent />} />
            <Recharts.Bar dataKey="count" name="Sells" barSize={18} fill="var(--chart-5)" />
            <Recharts.Line
              type="monotone"
              dataKey="count"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </Recharts.ComposedChart>
        </Recharts.ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

// ─── Main Reports Page ────────────────────────────────────────────────────────

function ReportsPage() {
  const { sales, loading, error } = useSales();

  const defaultEnd = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  // Client-side date-range filter (date range picker drives the histogram too)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Daily Balance Sheet
        </div>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="font-display text-4xl font-bold">Today&apos;s Sales</h1>
          {/* Live indicator */}
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <Wifi className="size-3" />
            Live
          </span>
        </div>
        <p className="text-muted-foreground mt-1">
          Showing sales between 00:00 and 23:59 (local time). Real-time sync from Supabase.
        </p>

        {/* DB error banner */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            <AlertTriangle className="size-4 mt-0.5 shrink-0 text-yellow-400" />
            <div>
              <strong className="font-semibold">Reports fallback:</strong> Could not load sales
              from the database ({error}). Showing local cache instead.
            </div>
          </div>
        )}
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border shadow-card animate-pulse">
              <div className="h-3 w-24 bg-muted rounded mb-3" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

      {/* Histogram */}
      <HistogramSection
        txs={filteredTxs}
        startStr={startDate}
        endStr={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      {/* Transaction table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card hover:border-primary/40 transition">
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
    </div>
  );
}
