import { createFileRoute } from "@tanstack/react-router";
import { Settings as Cog } from "lucide-react";
import { useEffect, useState } from "react";
import { useParts } from "@/hooks/use-parts";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — PartsPro" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [config, setConfig] = useState<string | null>(null);
  const [migrations, setMigrations] = useState<Array<{ path: string; sql: string }>>([]);
  const { parts } = useParts();
  const [uploadedUsers, setUploadedUsers] = useState<any[] | null>(null);

  useEffect(() => {
    // Vite: load raw files from the supabase folder
    const cfg = import.meta.glob("../../supabase/config.toml", { query: "?raw", import: "default" });
    const mig = import.meta.glob("../../supabase/migrations/*.sql", { query: "?raw", import: "default" });

    (async () => {
      try {
        // load config
        const cfgKeys = Object.keys(cfg);
        if (cfgKeys.length > 0) {
          // cfg[cfgKeys[0]] is a function returning a promise
          // @ts-ignore
          const c = await cfg[cfgKeys[0]]();
          setConfig(String(c || ""));
        }

        // load migrations
        const entries = Object.entries(mig) as Array<[string, () => Promise<string>]>
        const loaded = await Promise.all(entries.map(async ([p, loader]) => {
          const content = await loader();
          return { path: p.replace(/^\//, ""), sql: String(content || "") };
        }));
        // sort by filename
        loaded.sort((a, b) => a.path.localeCompare(b.path));
        setMigrations(loaded);
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="size-16 mx-auto rounded-2xl gradient-primary grid place-items-center shadow-glow">
          <Cog className="size-7 text-primary-foreground" />
        </div>
        <h1 className="font-display text-4xl font-bold mt-4">Settings</h1>
        <p className="text-muted-foreground mt-2">Workspace and database configuration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Supabase Config</div>
          <div className="mt-2 text-sm">
            {config ? (
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-left text-xs"><code>{config}</code></pre>
            ) : (
              <div className="text-muted-foreground">No config found in /supabase/config.toml</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Migrations</div>
          <div className="mt-2 space-y-3">
            {migrations.length === 0 && <div className="text-muted-foreground">No migrations found.</div>}
            {migrations.map((m) => (
              <details key={m.path} className="rounded-md bg-muted/10 p-2">
                <summary className="cursor-pointer font-medium">{m.path.split("/").pop()}</summary>
                <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs"><code>{m.sql}</code></pre>
              </details>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Database Overview</div>
        <div className="mt-2 text-sm text-muted-foreground">Parts table schema and triggers are listed from migrations above. Use the migration SQL for full details.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Items</div>
              <div className="font-semibold">Inventory Items</div>
            </div>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Make</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Initial</th>
                  <th className="px-3 py-2 text-right">Threshold</th>
                  <th className="px-3 py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {parts.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No items found.</td></tr>
                )}
                {parts.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.sku}</td>
                    <td className="px-3 py-2">{p.make}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.initial_qty ?? p.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.threshold}</td>
                    <td className="px-3 py-2 text-right tabular-nums">${p.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Accounts</div>
          <div className="mt-2 text-sm">
            <div className="mb-2">Upload a Supabase users JSON export to view registered Admin and Cashier accounts here.</div>
            <input type="file" accept="application/json" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const txt = await f.text();
                const parsed = JSON.parse(txt);
                // expect an array of user objects
                if (Array.isArray(parsed)) setUploadedUsers(parsed);
              } catch (err) {
                // ignore
              }
            }} />

            {!uploadedUsers && (
              <div className="mt-3 text-xs text-muted-foreground">You can export users from the Supabase dashboard or use the provided server script to download users as JSON, then upload it here.</div>
            )}

            {uploadedUsers && (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-xs font-medium">Cashiers</div>
                  <div className="mt-2 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2">Created</th></tr>
                      </thead>
                      <tbody>
                        {uploadedUsers.filter(u => u.user_metadata?.role === 'cashier').map(u => (
                          <tr key={u.id} className="border-t border-border"><td className="px-3 py-2">{u.email}</td><td className="px-3 py-2 text-muted-foreground">{u.created_at}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium">Admins</div>
                  <div className="mt-2 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2">Created</th></tr>
                      </thead>
                      <tbody>
                        {uploadedUsers.filter(u => u.user_metadata?.role === 'admin' || !u.user_metadata?.role).map(u => (
                          <tr key={u.id} className="border-t border-border"><td className="px-3 py-2">{u.email}</td><td className="px-3 py-2 text-muted-foreground">{u.created_at}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
