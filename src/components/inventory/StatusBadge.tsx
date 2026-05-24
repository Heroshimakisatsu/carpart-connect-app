import { cn } from "@/lib/utils";

export function StatusBadge({ qty, initial_qty }: { qty: number; initial_qty: number }) {
  const pct = (() => {
    if (initial_qty <= 0) return qty > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((qty / initial_qty) * 100)));
  })();

  const label =
    pct === 0 ? "Out of Stock"
      : pct <= 24 ? "Critically Low"
        : pct <= 49 ? "Low Stock"
          : pct <= 74 ? "Moderate Stock"
            : pct <= 99 ? "In Stock"
              : "Stock Full";

  const cls =
    pct === 0
      ? "bg-destructive/15 text-destructive border-destructive/40"
      : pct <= 24
        ? "bg-destructive/15 text-destructive border-destructive/40"
        : pct <= 49
          ? "bg-warning/15 text-warning border-warning/40"
          : pct <= 74
            ? "bg-yellow-400/15 text-yellow-700 border-yellow-400/40"
            : "bg-success/15 text-success border-success/30";

  const dotColor =
    pct === 0
      ? "bg-destructive"
      : pct <= 24
        ? "bg-destructive"
        : pct <= 49
          ? "bg-amber-400"
          : pct <= 74
            ? "bg-yellow-400"
            : "bg-emerald-500";

  const barColor =
    pct === 0
      ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.3)]"
      : pct <= 24
        ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.3)]"
        : pct <= 49
          ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          : pct <= 74
            ? "bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.3)]"
            : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";

  const pctTextColor =
    pct === 0
      ? "text-destructive"
      : pct <= 24
        ? "text-destructive"
        : pct <= 49
          ? "text-amber-400"
          : pct <= 74
            ? "text-yellow-400"
            : "text-emerald-400";

  return (
    <span className={cn("inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium border", cls)}>
      <span className={cn("size-1.5 rounded-full", dotColor)} />
      <span>{label}</span>

      <span className="ml-2 flex items-center gap-2">
        <div
          className="relative w-10 h-[18px] rounded-[4px] border border-slate-600/50 p-[2px] flex items-center bg-slate-900/90 shadow-inner"
          title={`${pct}% remaining`}
        >
          <div
            className={cn("h-full rounded-[2px] transition-all duration-500 ease-out", barColor)}
            style={{ width: `${pct}%` }}
          />
          <div className="absolute -right-[3px] top-[4px] w-[1.5px] h-[8px] rounded-r-[1px] bg-slate-600/50" />
        </div>
        <span className={cn("text-xs font-mono font-bold tracking-tight", pctTextColor)}>{pct}%</span>
      </span>
    </span>
  );
}
