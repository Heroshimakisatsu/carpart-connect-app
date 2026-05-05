import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, ArrowRight, Boxes, AlertTriangle, BarChart3, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PartsPro — Smarter Auto Parts Inventory" },
      { name: "description", content: "Track stock, prevent shortages, and run your auto spare parts business with confidence." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen blueprint-bg text-foreground">
      <header className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg gradient-primary grid place-items-center shadow-glow">
            <Wrench className="size-5 text-primary-foreground" />
          </div>
          <div className="font-display font-bold text-2xl tracking-tight">PartsPro</div>
        </div>
        <Link
          to="/auth"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
        >
          Sign in
        </Link>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs uppercase tracking-widest text-primary font-semibold">
          <Sparkles className="size-3.5" /> Built for workshops & parts dealers
        </div>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold mt-6 leading-[1.05] tracking-tight">
          Inventory that keeps your <span className="bg-gradient-to-r from-[oklch(0.72_0.18_50)] to-[oklch(0.62_0.2_35)] bg-clip-text text-transparent">garage moving</span>.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Track every spark plug, brake pad and filter in real-time. Get instant low-stock alerts and bulk-import your catalog from Excel.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:scale-[1.02] transition"
          >
            Get Started <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-border bg-card hover:border-primary/50 font-semibold transition"
          >
            Sign Up Free
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-5 stagger">
        {[
          { icon: Boxes, title: "Smart Catalog", desc: "Organize parts by make, category and SKU with instant search." },
          { icon: AlertTriangle, title: "Low-Stock Alerts", desc: "Never miss a sale — get notified before you run out." },
          { icon: BarChart3, title: "Live Insights", desc: "Real-time dashboards show what's selling and what's stuck." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl p-6 bg-card border border-border shadow-card hover:border-primary/40 transition">
            <div className="size-11 rounded-lg gradient-primary grid place-items-center shadow-glow mb-4">
              <Icon className="size-5 text-primary-foreground" />
            </div>
            <div className="font-display font-bold text-xl">{title}</div>
            <p className="text-sm text-muted-foreground mt-2">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PartsPro. Built for the bay.
      </footer>
    </div>
  );
}
