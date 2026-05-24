export const CAR_MAKES = [
  "Toyota","Honda","Nissan","Mazda","Subaru","Ford","Volkswagen","BMW","Mercedes","Other",
] as const;
export type CarMake = (typeof CAR_MAKES)[number];

export const CATEGORIES = [
  "Engine","Brakes","Suspension","Electrical","Filters","Transmission","Body","Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const MAKE_COLORS: Record<string, string> = {
  Toyota: "bg-red-500/15 text-red-600 border-red-500/40",
  Honda: "bg-orange-500/15 text-orange-600 border-orange-500/40",
  Nissan: "bg-stone-500/15 text-stone-600 border-stone-500/40",
  Mazda: "bg-rose-500/15 text-rose-600 border-rose-500/40",
  Subaru: "bg-blue-500/15 text-blue-600 border-blue-500/40",
  Ford: "bg-sky-500/15 text-sky-600 border-sky-500/40",
  Volkswagen: "bg-indigo-500/15 text-indigo-600 border-indigo-500/40",
  BMW: "bg-cyan-500/15 text-cyan-600 border-cyan-500/40",
  Mercedes: "bg-slate-500/15 text-slate-600 border-slate-500/40",
  Other: "bg-stone-500/15 text-stone-600 border-stone-500/40",
};

export type Part = {
  id: string;
  name: string;
  make: string;
  model: string;
  category: string;
  sku: string;
  price: number;
  qty: number;
  initial_qty: number;
  threshold: number;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StockAlertTier =
  | "out-of-stock"
  | "critically-low"
  | "low-stock"
  | "moderate-stock"
  | "in-stock"
  | "stock-full";

export function partStatus(p: Pick<Part, "qty" | "threshold">) {
  if (p.qty <= 0) return "out" as const;
  if (p.qty <= p.threshold) return "low" as const;
  return "in" as const;
}

export function stockPercentage(p: Pick<Part, "qty" | "initial_qty">) {
  if (p.initial_qty > 0) {
    return Math.max(0, Math.min(100, Math.round((p.qty / p.initial_qty) * 100)));
  }
  return p.qty <= 0 ? 0 : 100;
}

export function stockAlertTier(p: Pick<Part, "qty" | "initial_qty" | "threshold">): StockAlertTier {
  if (p.initial_qty > 0) {
    const pct = stockPercentage(p);
    if (pct === 0) return "out-of-stock";
    if (pct <= 24) return "critically-low";
    if (pct <= 49) return "low-stock";
    if (pct <= 74) return "moderate-stock";
    if (pct <= 99) return "in-stock";
    return "stock-full";
  }

  if (p.qty <= 0) return "out-of-stock";
  if (p.qty <= p.threshold) return "low-stock";
  return "stock-full";
}

export function isLowStockAlert(p: Pick<Part, "qty" | "initial_qty" | "threshold">) {
  const tier = stockAlertTier(p);
  return tier === "out-of-stock" || tier === "critically-low" || tier === "low-stock";
}

export function generateSku(make: string, category: string) {
  const m = (make || "GEN").slice(0,3).toUpperCase();
  const c = (category || "PT").slice(0,2).toUpperCase();
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `${m}-${c}-${n}`;
}
