import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Part } from "@/lib/parts";

export function useParts() {
  const [parts, setParts] = useState<Part[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("parts")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (!mounted) return;
        setParts((data as Part[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`parts-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parts" },
        (payload) => {
          setParts((prev) => {
            const list = prev ? [...prev] : [];
            if (payload.eventType === "INSERT") {
              return [payload.new as Part, ...list.filter((p) => p.id !== (payload.new as Part).id)];
            }
            if (payload.eventType === "UPDATE") {
              return list.map((p) => (p.id === (payload.new as Part).id ? (payload.new as Part) : p));
            }
            if (payload.eventType === "DELETE") {
              return list.filter((p) => p.id !== (payload.old as Part).id);
            }
            return list;
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { parts: parts ?? [], loading };
}
