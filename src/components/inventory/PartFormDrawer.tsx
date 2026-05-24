import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CAR_MAKES, CATEGORIES, generateSku, type Part } from "@/lib/parts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Part | null;
};

const empty = {
  name: "", make: "Toyota", model: "", category: "Engine",
  sku: "", price: "0", qty: "0", initial_qty: "0", threshold: "5", supplier: "", notes: "",
};

export function PartFormDrawer({ open, onOpenChange, editing }: Props) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, make: editing.make, model: editing.model,
        category: editing.category, sku: editing.sku,
        price: String(editing.price), qty: String(editing.qty),
        initial_qty: editing.initial_qty != null ? String(editing.initial_qty) : "",
        threshold: String(editing.threshold),
        supplier: editing.supplier ?? "", notes: editing.notes ?? "",
      });
    } else if (open) {
      setForm(empty);
    }
    setErrors({});
  }, [editing, open]);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.sku.trim()) e.sku = "Required";
    if (Number.isNaN(+form.price) || +form.price < 0) e.price = "Invalid";
    if (Number.isNaN(+form.qty) || +form.qty < 0) e.qty = "Invalid";
    if (Number.isNaN(+form.initial_qty) || +form.initial_qty < 0) e.initial_qty = "Invalid";
    if (Number.isNaN(+form.threshold) || +form.threshold < 0) e.threshold = "Invalid";
    setErrors(e);
    if (Object.keys(e).length) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(), make: form.make, model: form.model.trim(),
      category: form.category, sku: form.sku.trim(),
      price: +form.price, qty: +form.qty, initial_qty: +form.initial_qty, threshold: +form.threshold,
      supplier: form.supplier.trim() || null, notes: form.notes.trim() || null,
    };

    const execute = async (body: typeof payload) =>
      editing
        ? await supabase.from("parts").update(body).eq("id", editing.id)
        : await supabase.from("parts").insert(body);

    let { error } = await execute(payload);

    if (error && /initial_qty/i.test(error.message || "")) {
      const retryPayload = { ...payload };
      // Retry without initial_qty for databases that have not been migrated yet.
      delete (retryPayload as Partial<typeof retryPayload>).initial_qty;
      const retry = await execute(retryPayload);
      error = retry.error;
    }

    setSaving(false);
    if (error) {
      toast.error("Save failed", { description: error.message });
      return;
    }
    toast.success(editing ? "Part updated" : "Part added", { description: payload.name });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`w-full sm:max-w-lg overflow-y-auto bg-card ${shake ? "animate-shake" : ""}`}>
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{editing ? "Edit Part" : "Add New Part"}</SheetTitle>
          <SheetDescription>Track inventory details, pricing, and stock thresholds.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-4">
          <Field label="Part Name" error={errors.name}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Brake Pads Front" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Car Make">
              <Select value={form.make} onValueChange={(v) => set("make", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAR_MAKES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Compatible Model">
              <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Civic" />
            </Field>
          </div>

          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="SKU" error={errors.sku}>
            <div className="flex gap-2">
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="TOY-BP-1234" />
              <Button type="button" variant="secondary" onClick={() => set("sku", generateSku(form.make, form.category))}>
                <Sparkles className="size-4 mr-1" /> Auto
              </Button>
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <Field label="Price ($)" error={errors.price}>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
            <Field label="Quantity" error={errors.qty}>
              <Input type="number" value={form.qty} onChange={(e) => set("qty", e.target.value)} />
            </Field>
            <Field label="Initial Stock" error={errors.initial_qty}>
              <Input type="number" value={form.initial_qty} onChange={(e) => set("initial_qty", e.target.value)} />
            </Field>
            <Field label="Low Threshold" error={errors.threshold}>
              <Input type="number" value={form.threshold} onChange={(e) => set("threshold", e.target.value)} />
            </Field>
          </div>

          <Field label="Supplier">
            <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Bosch" />
          </Field>

          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes..." />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button onClick={submit} disabled={saving} className="flex-1 gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Part"}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
