import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dashboard } from "@/components/inventory/Dashboard";
import { useParts } from "@/hooks/use-parts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PartsPro" }] }),
  // SSR-safe: skip server prerender so we can read the session from
  // localStorage on the client without bouncing to /auth on first paint.
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    // Subscribe BEFORE getSession so we don't miss a SIGNED_IN event.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setSignedIn(!!session);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSignedIn(!!data.session);
      setAuthReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authReady && !signedIn) {
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true } as any);
    }
  }, [authReady, signedIn, navigate]);

  if (!authReady || !signedIn) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { parts, loading } = useParts();
  return <Dashboard parts={parts} loading={loading} />;
}