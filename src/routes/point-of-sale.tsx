import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  Package, Search, Plus, Minus, Trash2, 
  CheckCircle2, RefreshCw, X, ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useParts } from "@/hooks/use-parts";
import type { Part } from "@/lib/parts";
import { MAKE_COLORS } from "@/lib/parts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/point-of-sale")({
  head: () => ({ meta: [{ title: "Point of Sale — PartsPro" }] }),
  ssr: false,
  component: PointOfSale,
});

type CartItem = {
  part: Part;
  quantity: number;
};

function MakeBadge({ make }: { make: string }) {
  const color = MAKE_COLORS[make] || MAKE_COLORS.Other;
  return (
    <span className={cn("px-2 py-0.5 text-[11px] font-bold rounded border uppercase tracking-wider", color)}>
      {make}
    </span>
  );
}

function PointOfSale() {
  const navigate = useNavigate();
  const { parts, loading: partsLoading } = useParts();
  
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [cashierEmail, setCashierEmail] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch logged in cashier email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCashierEmail(data.user.email || "Cashier Terminal");
        setUserRole(data.user.user_metadata?.role || "admin");
      }
    });
  }, []);

  // Filter parts based on search
  const filteredParts = useMemo(() => {
    return parts
      .filter((part) => {
        const matchesSearch = 
          part.name.toLowerCase().includes(search.toLowerCase()) ||
          part.sku.toLowerCase().includes(search.toLowerCase()) ||
          part.make.toLowerCase().includes(search.toLowerCase()) ||
          part.model.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => b.price - a.price); // Sort by price descending
  }, [parts, search]);

  // Cart operations
  const addToCart = (part: Part) => {
    if (part.qty <= 0) {
      toast.error("This part is out of stock!");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.part.id === part.id);
      if (existing) {
        if (existing.quantity >= part.qty) {
          toast.warning(`Cannot add more. Only ${part.qty} units available in stock.`);
          return prev;
        }
        return prev.map((item) => 
          item.part.id === part.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      toast.success(`${part.name} added to cart`);
      return [...prev, { part, quantity: 1 }];
    });
  };

  const updateQuantity = (partId: string, delta: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.part.id !== partId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.part.qty) {
          toast.warning(`Cannot exceed available stock (${item.part.qty} units).`);
          return item;
        }
        return { ...item, quantity: newQty };
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (partId: string) => {
    setCart((prev) => prev.filter((item) => item.part.id !== partId));
    toast.info("Item removed from cart");
  };

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.part.price, 0);
  }, [cart]);

  const salesTax = useMemo(() => {
    return cartSubtotal * 0.08; // 8% sales tax
  }, [cartSubtotal]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + salesTax;
  }, [cartSubtotal, salesTax]);

  // Process Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    
    try {
      // Update quantities in Supabase
      const updates = cart.map(async (item) => {
        const newQty = Math.max(0, item.part.qty - item.quantity);
        const { error } = await supabase
          .from("parts")
          .update({ qty: newQty })
          .eq("id", item.part.id);
        
        if (error) throw error;
      });

      await Promise.all(updates);
      toast.success("Checkout completed successfully!");
      setCart([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-[1600px] mx-auto w-full">
        <div className="mb-6">
          <Link
            to={userRole === "cashier" ? "/cashier" : "/dashboard"}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to {userRole === "cashier" ? "Terminal" : "Dashboard"}</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg gradient-primary grid place-items-center shadow-glow">
            <Package className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Point of Sale</h1>
            <p className="text-sm text-muted-foreground">Manage your sales transactions</p>
          </div>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Side: Catalog search & items (8 cols) */}
          <section className="lg:col-span-8 flex flex-col gap-4 sm:gap-6 lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6">
            <div>
              <h3 className="text-primary text-[10px] sm:text-[11px] font-bold tracking-widest uppercase mb-1">Catalog</h3>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Record a sale</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">Search a part, tap to add. Stock updates in real-time.</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-4 sm:size-5" />
              <input
                type="text"
                placeholder="Search by name, SKU, make..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-2xl bg-card border border-border focus:border-primary outline-none transition text-sm text-foreground placeholder:text-muted-foreground"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")} 
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Grid of Parts */}
            {partsLoading ? (
              <div className={cn(
                "flex-1 rounded-2xl border p-8 sm:p-12 flex flex-col items-center justify-center gap-3 border-border bg-card/70"
              )}>
                <RefreshCw className="size-6 sm:size-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-xs sm:text-sm font-medium">Synchronizing live catalog database...</p>
              </div>
            ) : filteredParts.length === 0 ? (
              <div className={cn(
                "flex-1 rounded-2xl border border-dashed p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-3 border-border bg-muted/50"
              )}>
                <p className="text-muted-foreground text-xs sm:text-sm">No parts matched your query</p>
              </div>
            ) : (
            <div className="flex flex-col gap-2 pr-2 pb-10 flex-1 overflow-y-auto no-scrollbar">
                {filteredParts.map((part) => {
                  const isOut = part.qty <= 0;
                  
                  const baseStock = part.initial_qty > 0 ? part.initial_qty : Math.max(part.qty, part.threshold * 5, 20);
                  const maxStock = Math.max(part.qty, baseStock);
                  const stockPercentage = isOut ? 0 : Math.min(100, Math.max(0, Math.round((part.qty / maxStock) * 100)));
                  
                  return (
                    <div
                      key={part.id}
                      onClick={() => !isOut && addToCart(part)}
                      className={cn(
                        "flex flex-col gap-2 px-4 py-3 border hover:border-primary/40 hover:bg-accent transition-all duration-200 cursor-pointer group",
                        "bg-card border-border rounded-lg",
                        isOut && "opacity-40 cursor-not-allowed hover:border-border hover:bg-card"
                      )}
                    >
                      <div className="grid grid-cols-10 gap-2">
                        <div className="col-span-2 flex items-center">
                          <div className="font-semibold text-sm text-foreground group-hover:text-primary transition">
                            {part.name}
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span className="text-[11px] text-muted-foreground font-mono truncate">
                            {part.sku}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <MakeBadge make={part.make} />
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className="text-[11px] text-muted-foreground truncate">
                            {part.model || 'Universal'}
                          </span>
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border truncate">
                            {part.category || 'Engine'}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          <span className="font-bold text-sm text-primary">
                            ${Number(part.price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn(
                          "text-[10px] font-mono font-bold tracking-tight tabular-nums",
                          isOut 
                            ? "text-muted-foreground" 
                            : stockPercentage <= 20 
                              ? "text-destructive" 
                              : stockPercentage <= 50 
                                ? "text-warning" 
                                : "text-emerald-400"
                        )}>
                          {part.qty} / {maxStock}
                        </span>
                        
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                          isOut 
                            ? "bg-muted/15 text-muted-foreground border-muted/30" 
                            : stockPercentage <= 20 
                              ? "bg-destructive/15 text-destructive border-destructive/30" 
                              : stockPercentage <= 50 
                                ? "bg-warning/15 text-warning border-warning/30" 
                                : "bg-success/15 text-success border-success/30"
                        )}>
                          <span className={cn("size-1 rounded-full", isOut ? "bg-muted-foreground" : stockPercentage <= 20 ? "bg-destructive" : stockPercentage <= 50 ? "bg-warning" : "bg-emerald-500")} />
                          <span>{isOut ? "Out" : stockPercentage <= 20 ? "Low" : stockPercentage <= 50 ? "Medium" : "Full"}</span>
                        </span>
                        
                        <div className="relative w-8 h-[14px] rounded-[3px] border border-border p-[1.5px] flex items-center bg-muted shadow-inner flex-shrink-0" title={`${stockPercentage}% remaining`}>
                          <div
                            className={cn(
                              "h-full rounded-[1.5px] transition-all duration-500 ease-out",
                              isOut 
                                ? "w-0" 
                                : stockPercentage <= 20 
                                  ? "bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.4)]" 
                                  : stockPercentage <= 50 
                                    ? "bg-warning shadow-[0_0_6px_rgba(245,158,11,0.4)]" 
                                    : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                            )}
                            style={{ width: `${isOut ? 0 : Math.max(6, stockPercentage)}%` }}
                          />
                          <div className="absolute -right-[2px] top-[3px] w-[1px] h-[6px] rounded-r-[0.5px] bg-border" />
                        </div>
                        
                        <span className={cn(
                          "text-[10px] font-mono font-bold tracking-tight",
                          isOut 
                            ? "text-muted-foreground" 
                            : stockPercentage <= 20 
                              ? "text-destructive" 
                              : stockPercentage <= 50 
                                ? "text-warning" 
                                : "text-emerald-400"
                        )}>
                          {isOut ? "0%" : `${stockPercentage}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right Side: Active Cart details (4 cols) */}
          <section className="lg:col-span-4 flex flex-col gap-4 sm:gap-6 lg:sticky lg:top-20 lg:self-start">
            <div className={cn(
              "rounded-[20px] sm:rounded-[24px] flex flex-col h-[400px] sm:h-[500px] backdrop-blur-md shadow-lg border bg-card border-border"
            )}>
              <div className={cn("p-4 sm:p-6 flex items-center justify-between border-b border-border")}>
                <h3 className={cn("font-bold flex items-center gap-2 text-[15px] sm:text-[17px] text-foreground")}>
                  <Package className="size-4 sm:size-5 text-primary" /> Current sale
                </h3>
                <span className="text-muted-foreground text-xs font-medium">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-sm">
                    Add parts from the catalog
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.part.id} className={cn("flex items-center justify-between group")}>
                        <div className="flex flex-col">
                          <span className={cn("font-semibold text-sm group-hover:text-primary transition text-foreground")}>
                            {item.part.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">{item.part.sku}</span>
                            <span className="text-[11px] text-muted-foreground">·</span>
                            <span className="text-[11px] text-muted-foreground">${Number(item.part.price).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className={cn("flex items-center gap-3 px-2 py-1 rounded-lg border bg-muted border-border")}>
                            <button onClick={() => updateQuantity(item.part.id, -1)} className="text-muted-foreground hover:text-foreground">
                              <Minus className="size-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.part.id, 1)} className="text-muted-foreground hover:text-foreground">
                              <Plus className="size-3" />
                            </button>
                          </div>
                          
                          <div className={cn("font-bold text-sm w-16 text-right text-foreground")}>
                            ${(item.quantity * item.part.price).toFixed(2)}
                          </div>
                          <button onClick={() => removeFromCart(item.part.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={cn("p-4 sm:p-6 border-t flex flex-col gap-4 sm:gap-5 border-border")}>
                <div className="flex justify-between items-end">
                  <span className="text-muted-foreground text-[12px] font-bold tracking-widest uppercase">Total</span>
                  <span className={cn("font-bold text-4xl tracking-tight text-foreground")}>
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut || cart.length === 0}
                  className="w-full py-4 rounded-xl gradient-primary text-primary-foreground font-semibold transition disabled:opacity-50 disabled:hover:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <RefreshCw className="size-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                  Complete sale
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
