import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Search, Trash2, PackageX } from "lucide-react";
import { Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useRef } from "react";
import { CAR_MAKES, CATEGORIES, partStatus, type Part } from "@/lib/parts";
import { StatusBadge } from "./StatusBadge";
import { MakeBadge } from "./MakeBadge";
import { PartFormDrawer } from "./PartFormDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SortKey = "name" | "make" | "category" | "price" | "qty";

export function InventoryTable({ parts, loading }: { parts: Part[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [makeF, setMakeF] = useState<string>("all");
  const [catF, setCatF] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [confirmDel, setConfirmDel] = useState<Part | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // debounce search
  useMemo(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    let list = parts;
    const q = debounced.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.name, p.make, p.model, p.category, p.sku, p.supplier ?? "", p.notes ?? ""]
          .join(" ").toLowerCase().includes(q),
      );
    }
    if (makeF !== "all") list = list.filter((p) => p.make === makeF);
    if (catF !== "all") list = list.filter((p) => p.category === catF);
    if (statusF !== "all") list = list.filter((p) => partStatus(p) === statusF);
    list = [...list].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return list;
  }, [parts, debounced, makeF, catF, statusF, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const SortHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {children}
      {sortKey === k ? (sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  );

  const doDelete = async () => {
    if (!confirmDel) return;
    setRemovingId(confirmDel.id);
    setTimeout(async () => {
      const { error } = await supabase.from("parts").delete().eq("id", confirmDel.id);
      setRemovingId(null);
      setConfirmDel(null);
      if (error) toast.error("Delete failed", { description: error.message });
      else toast.success("Part deleted");
    }, 350);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!rows.length) {
        toast.error("Empty file");
        return;
      }
      const norm = (k: string) => k.toLowerCase().trim().replace(/\s+/g, "_");
      const payload = rows.map((r) => {
        const o: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) o[norm(k)] = v;
        return {
          name: String(o.name ?? o.part ?? "").trim(),
          make: String(o.make ?? "Other").trim(),
          model: String(o.model ?? "").trim(),
          category: String(o.category ?? "Other").trim(),
          sku: String(o.sku ?? "").trim() || `IMP-${Math.floor(Math.random() * 9000 + 1000)}`,
          price: Number(o.price ?? 0) || 0,
          qty: Number(o.qty ?? o.quantity ?? 0) || 0,
          threshold: Number(o.threshold ?? 5) || 5,
          supplier: o.supplier ? String(o.supplier) : null,
          notes: o.notes ? String(o.notes) : null,
        };
      }).filter((p) => p.name);
      if (!payload.length) {
        toast.error("No valid rows", { description: "Make sure your sheet has a 'name' column." });
        return;
      }
      const { error } = await supabase.from("parts").insert(payload);
      if (error) toast.error("Import failed", { description: error.message });
      else toast.success(`Imported ${payload.length} parts`);
    } catch (err) {
      toast.error("Could not parse file", { description: (err as Error).message });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: "Brake Pads Front", make: "Toyota", model: "Camry", category: "Brakes", sku: "TOY-BR-1234", price: 49.99, qty: 20, threshold: 5, supplier: "Bosch", notes: "" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parts");
    XLSX.writeFile(wb, "parts-template.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts, SKUs, suppliers..." className="pl-9 bg-card" />
        </div>
        <Select value={makeF} onValueChange={setMakeF}>
          <SelectTrigger className="w-full md:w-36 bg-card"><SelectValue placeholder="Make" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Makes</SelectItem>
            {CAR_MAKES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={catF} onValueChange={setCatF}>
          <SelectTrigger className="w-full md:w-40 bg-card"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-full md:w-36 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in">In Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition active:scale-95">
          <Plus className="size-4 mr-1" /> Add Part
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="active:scale-95">
          <Upload className="size-4 mr-1" /> {importing ? "Importing..." : "Import Excel"}
        </Button>
        <Button variant="ghost" onClick={downloadTemplate} className="active:scale-95">
          <Download className="size-4 mr-1" /> Template
        </Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3"><SortHead k="name">Part</SortHead></th>
                <th className="text-left px-4 py-3"><SortHead k="make">Make</SortHead></th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Model</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell"><SortHead k="category">Category</SortHead></th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">SKU</th>
                <th className="text-right px-4 py-3"><SortHead k="price">Price</SortHead></th>
                <th className="text-right px-4 py-3"><SortHead k="qty">Qty</SortHead></th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-4 rounded bg-muted/60 animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9}>
                  <div className="py-16 flex flex-col items-center text-center gap-3">
                    <div className="size-16 rounded-2xl bg-muted/40 grid place-items-center"><PackageX className="size-7 text-muted-foreground" /></div>
                    <div className="font-display text-lg">No parts found</div>
                    <p className="text-sm text-muted-foreground max-w-sm">Try adjusting your search or filters, or add a new part to your inventory.</p>
                  </div>
                </td></tr>
              )}
              {!loading && filtered.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    "border-t border-border transition-all hover:bg-accent/40 hover:shadow-[inset_3px_0_0_0_var(--primary)]",
                    removingId === p.id && "row-collapse",
                  )}
                >
                  <td className="px-4 py-3 font-medium">{p.name}{p.supplier && <div className="text-xs text-muted-foreground">{p.supplier}</div>}</td>
                  <td className="px-4 py-3"><MakeBadge make={p.make} /></td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.model || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{p.category}</td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs text-muted-foreground">{p.sku}</td>
                  <td className="px-4 py-3 text-right tabular-nums">${Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.qty}</td>
                  <td className="px-4 py-3"><StatusBadge qty={p.qty} threshold={p.threshold} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }} className="size-8">
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDel(p)} className="size-8 hover:text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PartFormDrawer open={open} onOpenChange={setOpen} editing={editing} />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this part?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDel?.name}" will be permanently removed from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
