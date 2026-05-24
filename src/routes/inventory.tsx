import { createFileRoute } from "@tanstack/react-router";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { useParts } from "@/hooks/use-parts";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — PartsPro" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { parts, loading, missingInitialQty } = useParts();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-primary font-semibold">Catalog</div>
        <h1 className="font-display text-4xl font-bold mt-1">Inventory</h1>
        <p className="text-muted-foreground mt-1">Manage every part in stock.</p>
      </div>
      <InventoryTable parts={parts} loading={loading} missingInitialQty={missingInitialQty} />
    </div>
  );
}
