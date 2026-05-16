import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wrench, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

type Search = { mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  head: () => ({ meta: [{ title: "Sign in — PartsPro" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => setIsSignup(mode === "signup"), [mode]);
  // NOTE: We intentionally do NOT auto-redirect on SIGNED_IN here.
  // Supabase fires SIGNED_IN on initial session restore from localStorage,
  // which would bounce already-signed-in visitors off /auth the moment they
  // land here (e.g. clicking "Get Started" from the landing page).
  // The form submit and OAuth flow already navigate to /dashboard explicitly.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        // If email confirmation is on, signUp returns no session — sign in directly.
        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw signInErr;
        }
        toast.success("Account created! Redirecting...");
        window.location.href = "/dashboard";
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        window.location.href = "/dashboard";
        return;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen blueprint-bg grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-sidebar border-r border-sidebar-border relative overflow-hidden">
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="size-10 rounded-lg gradient-primary grid place-items-center shadow-glow">
            <Wrench className="size-5 text-primary-foreground" />
          </div>
          <div className="font-display font-bold text-2xl">PartsPro</div>
        </Link>
        <div className="relative z-10">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Built for the people who keep wheels turning.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md">
            Join hundreds of workshops tracking inventory in real-time with PartsPro.
          </p>
        </div>
        <div className="text-xs text-muted-foreground relative z-10">
          © {new Date().getFullYear()} PartsPro
        </div>
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full gradient-primary opacity-20 blur-3xl" />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-up">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="size-4" /> Back to home
          </Link>

          <h1 className="font-display text-3xl font-bold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isSignup ? "Start managing your parts in minutes." : "Sign in to access your inventory."}
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/50 transition font-medium disabled:opacity-60"
          >
            <svg className="size-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary outline-none transition"
                placeholder="you@workshop.com"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-card border border-border focus:border-primary outline-none transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword((v) => !v);
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-md text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="size-4 pointer-events-none" />
                  ) : (
                    <Eye className="size-4 pointer-events-none" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:scale-[1.01] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            {isSignup ? "Already have an account?" : "New to PartsPro?"}{" "}
            <button
              type="button"
              onClick={() => {
                const next = !isSignup;
                setIsSignup(next);
                navigate({ to: "/auth", search: { mode: next ? "signup" : "signin" } });
              }}
              className="text-primary font-semibold hover:underline"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}