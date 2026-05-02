import { partStatus } from "@/lib/parts";
import { cn } from "@/lib/utils";

export function StatusBadge({ qty, threshold }: { qty: number; threshold: number }) {
  const s = partStatus({ qty, threshold });
  const label = s === "in" ? "In Stock" : s === "low" ? "Low Stock" : "Out of Stock";
  const cls =
    s === "in"
      ? "bg-success/15 text-success border-success/30"
      : s === "low"
        ? "bg-warning/15 text-warning border-warning/40"
        : "bg-destructive/15 text-destructive border-destructive/40";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", cls)}>
      <span className={cn("size-1.5 rounded-full",
        s === "in" ? "bg-success" : s === "low" ? "bg-warning" : "bg-destructive pulse-dot",
      )} />
      {label}
    </span>
  );
}
