import { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Package, DollarSign, AlertTriangle, XCircle, Clock } from "lucide-react";
import type { Part } from "@/lib/parts";
import { partStatus, stockAlertTier } from "@/lib/parts";
import { MakeBadge } from "./MakeBadge";

function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function Stat({ icon: Icon, label, value, color, format }: any) {
  const v = useCountUp(value);
  const display = format ? format(v) : Math.round(v).toLocaleString();
  return (
    <div className="rounded-2xl p-5 bg-card border border-border shadow-card relative overflow-hidden group hover:border-primary/40 transition">
      <div className={`absolute -right-6 -top-6 size-24 rounded-full opacity-20 blur-2xl ${color}`} />
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-xl grid place-items-center ${color}`}>
          <Icon className="size-5 text-primary-foreground" />
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
      <div className="mt-3 font-display text-3xl font-bold tabular-nums">{display}</div>
    </div>
  );
}

const PIE_COLORS = ["#f97316","#3b82f6","#22c55e","#a855f7","#eab308","#06b6d4","#ec4899","#94a3b8","#84cc16","#64748b"];

export function Dashboard({ parts, loading }: { parts: Part[]; loading: boolean }) {
  const totalParts = parts.reduce((s, p) => s + p.qty, 0);
  const totalValue = parts.reduce((s, p) => s + p.qty * Number(p.price), 0);
  const lowStock = parts.filter((p) => {
    const tier = stockAlertTier(p);
    return tier === "critically-low" || tier === "low-stock";
  }).length;
  const outStock = parts.filter((p) => partStatus(p) === "out").length;

  const byMake = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach((p) => map.set(p.make, (map.get(p.make) ?? 0) + p.qty));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [parts]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + p.qty));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [parts]);

  const recent = useMemo(() => [...parts].sort((a,b)=>+new Date(b.updated_at)-+new Date(a.updated_at)).slice(0,6), [parts]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-primary font-semibold">Overview</div>
        <h1 className="font-display text-4xl font-bold mt-1">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time snapshot of your spare parts inventory.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <Stat icon={Package} label="Total Parts" value={totalParts} color="gradient-primary" />
        <Stat icon={DollarSign} label="Stock Value" value={totalValue} color="bg-gradient-to-br from-emerald-500 to-emerald-700" format={(v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Stat icon={AlertTriangle} label="Low Stock" value={lowStock} color="bg-gradient-to-br from-amber-500 to-amber-700" />
        <Stat icon={XCircle} label="Out of Stock" value={outStock} color="bg-gradient-to-br from-rose-500 to-rose-700" />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-card border border-border p-5 shadow-card lg:col-span-2 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-lg">Parts by Make</h3>
            <span className="text-xs text-muted-foreground">{byMake.length} makes</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byMake} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {byMake.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {byMake.map((m, i) => (
              <div key={m.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {m.name} <span className="text-foreground/80">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 shadow-card lg:col-span-3 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-lg">Top Categories by Quantity</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byCategory}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} cursor={{ fill: "oklch(0.72 0.18 50 / 0.1)" }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-card animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="size-4 text-primary" />
          <h3 className="font-display font-semibold text-lg">Recent Activity</h3>
        </div>
        <div className="divide-y divide-border">
          {loading && <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>}
          {!loading && recent.map((p) => (
            <div key={p.id} className="py-3 flex items-center gap-3">
              <MakeBadge make={p.make} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.category} · {p.sku}</div>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{new Date(p.updated_at).toLocaleString()}</div>
            </div>
          ))}
          {!loading && recent.length === 0 && <div className="py-6 text-center text-muted-foreground text-sm">No activity yet.</div>}
        </div>
      </div>
    </div>
  );
}
