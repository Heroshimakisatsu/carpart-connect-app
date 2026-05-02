export const CAR_MAKES = [
  "Toyota","Honda","Nissan","Mazda","Subaru","Ford","Volkswagen","BMW","Mercedes","Other",
] as const;
export type CarMake = (typeof CAR_MAKES)[number];

export const CATEGORIES = [
  "Engine","Brakes","Suspension","Electrical","Filters","Transmission","Body","Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const MAKE_COLORS: Record<string, string> = {
  Toyota: "bg-red-600/20 text-red-300 border-red-500/40",
  Honda: "bg-red-900/30 text-red-300 border-red-700/40",
  Nissan: "bg-zinc-500/20 text-zinc-200 border-zinc-400/40",
  Mazda: "bg-rose-700/20 text-rose-300 border-rose-600/40",
  Subaru: "bg-blue-600/20 text-blue-300 border-blue-500/40",
  Ford: "bg-sky-600/20 text-sky-300 border-sky-500/40",
  Volkswagen: "bg-indigo-700/30 text-indigo-200 border-indigo-500/40",
  BMW: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  Mercedes: "bg-slate-400/20 text-slate-100 border-slate-300/40",
  Other: "bg-muted text-muted-foreground border-border",
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
  threshold: number;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function partStatus(p: Pick<Part,"qty"|"threshold">) {
  if (p.qty <= 0) return "out" as const;
  if (p.qty <= p.threshold) return "low" as const;
  return "in" as const;
}

export function generateSku(make: string, category: string) {
  const m = (make || "GEN").slice(0,3).toUpperCase();
  const c = (category || "PT").slice(0,2).toUpperCase();
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `${m}-${c}-${n}`;
}
