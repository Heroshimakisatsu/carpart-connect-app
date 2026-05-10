import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Part } from "@/lib/parts";

// Module-level singleton store: one fetch, one realtime channel,
// shared across every component that calls useParts().
type State = { parts: Part[] | null; loading: boolean };

let state: State = { parts: null, loading: true };
const listeners = new Set<() => void>();
let initialized = false;
let channel: ReturnType<typeof supabase.channel> | null = null;

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  supabase
    .from("parts")
    .select("*")
    .order("updated_at", { ascending: false })
    .then(({ data }) => {
      setState({ parts: (data as Part[]) ?? [], loading: false });
    });

  channel = supabase
    .channel("parts-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "parts" },
      (payload) => {
        const list = state.parts ? [...state.parts] : [];
        let next = list;
        if (payload.eventType === "INSERT") {
          const row = payload.new as Part;
          next = [row, ...list.filter((p) => p.id !== row.id)];
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as Part;
          next = list.map((p) => (p.id === row.id ? row : p));
        } else if (payload.eventType === "DELETE") {
          const row = payload.old as Part;
          next = list.filter((p) => p.id !== row.id);
        }
        setState({ ...state, parts: next });
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

export function useParts() {
  useEffect(() => {
    ensureInitialized();
  }, []);

  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );

  return { parts: snapshot.parts ?? [], loading: snapshot.loading };
}
