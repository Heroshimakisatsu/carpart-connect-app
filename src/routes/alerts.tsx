import { createFileRoute } from "@tanstack/react-router";
import { useParts } from "@/hooks/use-parts";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { isLowStockAlert } from "@/lib/parts";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Low Stock Alerts — PartsPro" }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const { parts, loading } = useParts();
  const filtered = parts.filter((p) => isLowStockAlert(p));
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-destructive font-semibold">Attention Required</div>
        <h1 className="font-display text-4xl font-bold mt-1">Low Stock Alerts</h1>
        <p className="text-muted-foreground mt-1">{filtered.length} parts are out of stock or low on inventory.</p>
      </div>
      <InventoryTable parts={filtered} loading={loading} />
    </div>
  );
}
