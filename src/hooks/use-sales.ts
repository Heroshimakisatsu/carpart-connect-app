import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SaleRow = Tables<"sales">;

export type SaleItem = {
  name: string;
  make: string;
  sku: string;
  price: number;
  quantity: number;
};

export type Transaction = {
  id: string;
  date: string;
  cashier: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
};

// ─── Module-level singleton ──────────────────────────────────────────────────
type State = { sales: Transaction[] | null; loading: boolean; error: string | null };

let state: State = { sales: null, loading: true, error: null };
const listeners = new Set<() => void>();
let initialized = false;
let channel: ReturnType<typeof supabase.channel> | null = null;

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function rowToTransaction(row: SaleRow): Transaction {
  return {
    id: row.id,
    date: row.created_at,
    cashier: row.cashier,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    total: Number(row.total),
    items: Array.isArray(row.items) ? (row.items as SaleItem[]) : [],
  };
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  supabase
    .from("sales")
    .select("id,cashier,items,subtotal,tax,total,created_at")
    .order("created_at", { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        console.error("[use-sales] fetch error:", error.message);
        // Fall back to local storage
        try {
          const raw = localStorage.getItem("partspro-sales-history");
          const local = raw ? (JSON.parse(raw) as Transaction[]) : [];
          setState({ sales: local, loading: false, error: error.message });
        } catch {
          setState({ sales: [], loading: false, error: error.message });
        }
        return;
      }
      const list = (data ?? []).map(rowToTransaction);
      setState({ sales: list, loading: false, error: null });
    });

  // Subscribe to realtime INSERT events on the sales table
  channel = supabase
    .channel("sales-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "sales" },
      (payload) => {
        const newRow = payload.new as SaleRow;
        const tx = rowToTransaction(newRow);
        const current = state.sales ? [...state.sales] : [];
        // Prepend – newest first, avoid duplicates
        const next = [tx, ...current.filter((s) => s.id !== tx.id)];
        setState({ ...state, sales: next });
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "sales" },
      (payload) => {
        const deleted = payload.old as { id: string };
        const next = (state.sales ?? []).filter((s) => s.id !== deleted.id);
        setState({ ...state, sales: next });
      }
    )
    .subscribe();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useSales() {
  useEffect(() => {
    ensureInitialized();
  }, []);

  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );

  return {
    sales: snapshot.sales ?? [],
    loading: snapshot.loading,
    error: snapshot.error,
  };
}
