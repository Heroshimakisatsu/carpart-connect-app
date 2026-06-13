import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  Package, Search, Plus, Minus, Trash2, LogOut, 
  CheckCircle2, Printer, Clock, Wrench, Sparkles, Database, 
  AlertTriangle, RefreshCw, X, Sun, Moon, ShoppingCart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useParts } from "@/hooks/use-parts";
import type { Part } from "@/lib/parts";
import { partStatus, MAKE_COLORS } from "@/lib/parts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme-context";

export const Route = createFileRoute("/cashier")({
  head: () => ({ meta: [{ title: "Cashier Checkout — PartsPro" }] }),
  ssr: false,
  component: CashierDashboard,
});

type CartItem = {
  part: Part;
  quantity: number;
};

type Transaction = {
  id: string;
  date: string;
  items: { name: string; make: string; sku: string; price: number; quantity: number }[];
  subtotal: number;
  tax: number;
  total: number;
  cashier: string;
};

function MakeBadge({ make }: { make: string }) {
  const color = MAKE_COLORS[make] || MAKE_COLORS.Other;
  return (
    <span className={cn("px-2 py-0.5 text-[11px] font-bold rounded border uppercase tracking-wider", color)}>
      {make}
    </span>
  );
}

function CashierDashboard() {
  const navigate = useNavigate();
  const { parts, loading: partsLoading } = useParts();
  const { theme, toggleTheme } = useTheme();
  
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [cashierEmail, setCashierEmail] = useState("");
  
  // Receipt and History states
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [salesHistory, setSalesHistory] = useState<Transaction[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [dailySalesSearch, setDailySalesSearch] = useState("");

  const dailySales = useMemo(() => {
    const todayStr = new Date().toDateString();
    return salesHistory.filter((tx) => new Date(tx.date).toDateString() === todayStr);
  }, [salesHistory]);

  const filteredDailySales = useMemo(() => {
    const needle = dailySalesSearch.trim().toLowerCase();
    if (!needle) return dailySales;
    return dailySales.filter((tx) =>
      tx.id.toLowerCase().includes(needle) ||
      tx.items.some((item) =>
        item.name.toLowerCase().includes(needle) ||
        (item.sku && item.sku.toLowerCase().includes(needle)) ||
        (item.make && item.make.toLowerCase().includes(needle))
      )
    );
  }, [dailySales, dailySalesSearch]);

  const dailyStats = useMemo(() => {
    let totalRevenue = 0;
    let totalItems = 0;
    const totalTransactions = dailySales.length;
    
    dailySales.forEach((tx) => {
      totalRevenue += tx.total;
      tx.items.forEach((item) => {
        totalItems += item.quantity;
      });
    });
    
    return { totalRevenue, totalItems, totalTransactions };
  }, [dailySales]);

  // Fetch logged in cashier email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCashierEmail(data.user.email || "Cashier Terminal");
      }
    });

    // Load sales history from localStorage
    try {
      const saved = localStorage.getItem("partspro-sales-history");
      if (saved) {
        setSalesHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load sales history:", e);
    }
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate({ to: "/auth", replace: true } as any);
  };

  // Categories extraction
  const categories = useMemo(() => {
    return ["All", "Engine", "Brakes", "Suspension", "Electrical", "Filters", "Transmission", "Body", "Other"];
  }, []);

  // Filter parts based on search & category
  const filteredParts = useMemo(() => {
    return parts
      .filter((part) => {
        const matchesSearch = 
          part.name.toLowerCase().includes(search.toLowerCase()) ||
          part.sku.toLowerCase().includes(search.toLowerCase()) ||
          part.make.toLowerCase().includes(search.toLowerCase()) ||
          part.model.toLowerCase().includes(search.toLowerCase());
        
        const matchesCategory = selectedCategory === "All" || part.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => b.price - a.price); // Sort by price descending
  }, [parts, search, selectedCategory]);

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
      // 1. Update quantities in Supabase
      const updates = cart.map(async (item) => {
        const newQty = Math.max(0, item.part.qty - item.quantity);
        const { error } = await supabase
          .from("parts")
          .update({ qty: newQty })
          .eq("id", item.part.id);
        
        if (error) throw error;
      });

      await Promise.all(updates);

      // 2. Build Transaction object
      const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      const transaction: Transaction = {
        id: txId,
        date: new Date().toISOString(),
        items: cart.map(item => ({
          name: item.part.name,
          make: item.part.make,
          sku: item.part.sku,
          price: item.part.price,
          quantity: item.quantity
        })),
        subtotal: cartSubtotal,
        tax: salesTax,
        total: cartTotal,
        cashier: cashierEmail
      };

      // 3. Save to Supabase sales history and local storage
      const { error: salesError } = await supabase.from("sales").insert({
        cashier: transaction.cashier,
        items: transaction.items,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        total: transaction.total,
      });
      if (salesError) {
        console.warn("Failed to save sale to database:", salesError.message);
      }

      const updatedHistory = [transaction, ...salesHistory];
      setSalesHistory(updatedHistory);
      localStorage.setItem("partspro-sales-history", JSON.stringify(updatedHistory));

      // 4. Open Receipt
      setActiveReceipt(transaction);
      setShowReceiptModal(true);

      // 5. Success states
      toast.success("Checkout completed successfully!");
      setCart([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col sm:flex-row font-sans print:bg-white print:text-black transition-colors duration-300 blueprint-bg",
      theme === "dark" ? "text-foreground" : "text-foreground"
    )}>
      {/* Mobile Header */}
      <header className={cn(
        "sm:hidden h-16 sticky top-0 z-10 flex items-center justify-between px-4 border-b print:hidden transition-colors duration-300 bg-sidebar border-sidebar-border text-sidebar-foreground",
        theme === "dark" ? "" : "shadow-sm"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg gradient-primary grid place-items-center shadow-glow">
              <Wrench className="size-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none justify-center">
              <div className="font-bold text-base text-foreground">PartsPro</div>
              <div className="text-[8px] text-primary font-bold tracking-widest uppercase mt-0.5">Cashier</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={cn(
              "relative size-8 rounded-xl border flex items-center justify-center transition-all duration-300 border-sidebar-border bg-sidebar hover:bg-sidebar-accent/60 text-sidebar-foreground"
            )}
          >
            <span className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300",
              theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"
            )}>
              <Moon className="size-3.5" />
            </span>
            <span className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300",
              theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
            )}>
              <Sun className="size-3.5" />
            </span>
          </button>

          <button 
            onClick={handleSignOut} 
            className={cn(
              "size-8 rounded-xl border flex items-center justify-center transition border-sidebar-border bg-sidebar hover:bg-sidebar-accent/60 text-sidebar-foreground"
            )}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden sm:flex flex-col w-64 border-r print:hidden transition-colors duration-300 bg-sidebar border-sidebar-border sticky top-0 h-screen overflow-y-auto",
        theme === "dark" ? "" : "shadow-sm"
      )}>
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg gradient-primary grid place-items-center shadow-glow">
              <Wrench className="size-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none justify-center">
              <div className="font-bold text-lg text-foreground">PartsPro</div>
              <div className="text-[9px] text-primary font-bold tracking-widest uppercase mt-0.5">Cashier</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-sidebar-foreground mb-1 break-words">{cashierEmail}</div>
            <div className="text-xs text-sidebar-foreground/75">Live sales terminal</div>
          </div>

          {/* Point of Sale Section */}
          <div 
            onClick={() => navigate({ to: "/point-of-sale" })}
            className="flex flex-col gap-3 cursor-pointer hover:bg-sidebar-accent/60 p-2 rounded-lg transition"
          >
            <h3 className={cn("font-bold flex items-center gap-2 text-sm text-sidebar-foreground flex-wrap")}>
              <ShoppingCart className="size-4 text-primary" /> Point of Sale
            </h3>
            <div className="flex flex-col text-sidebar-foreground/75 text-sm">
              <div className="py-4 text-center text-sidebar-foreground/60 text-xs">
                Active cart: {cart.length} items
              </div>
              <div className="text-center text-xs font-semibold text-sidebar-foreground">
                Total: ${cartTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Recent Sales Section */}
          <div 
            onClick={() => navigate({ to: "/recent-sales" })}
            className="flex flex-col gap-3 cursor-pointer hover:bg-sidebar-accent/60 p-2 rounded-lg transition"
          >
            <h3 className={cn("font-bold flex items-center gap-2 text-sm text-sidebar-foreground flex-wrap")}>
              <Database className="size-4 text-primary" /> Recent sales
            </h3>
            
            <div className="flex flex-col text-sidebar-foreground/75 text-sm">
              {salesHistory.length === 0 ? null : (
                <div className="space-y-1">
                  {salesHistory.slice(0, 5).map((tx) => (
                    <div 
                      key={tx.id} 
                      className={cn("flex flex-wrap justify-between items-center p-2 rounded-lg cursor-pointer transition group hover:bg-sidebar-accent/60 border border-transparent hover:border-sidebar-border gap-2")}
                    >
                      <div className="flex flex-col min-w-[120px]">
                        <span className={cn("font-medium text-xs text-sidebar-foreground group-hover:text-primary")}>{tx.id}</span>
                        <span className="text-[10px] text-sidebar-foreground/70">
                          {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={cn("font-bold text-xs text-sidebar-foreground")}>${tx.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {salesHistory.length > 5 && (
                    <div className="w-full text-center text-xs text-primary hover:text-primary/80 font-semibold pt-2 pb-1">
                      View all history ({salesHistory.length})
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={cn(
                "relative w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-3 flex-wrap transition-all duration-300 border-sidebar-border bg-sidebar hover:bg-sidebar-accent/60 text-sidebar-foreground"
              )}
            >
              <span className={cn(
                "transition-all duration-300",
                theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50 absolute"
              )}>
                <Moon className="size-4" />
              </span>
              <span className={cn(
                "transition-all duration-300",
                theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
              )}>
                <Sun className="size-4" />
              </span>
              <span className="text-sm font-semibold">Toggle Theme</span>
            </button>

            <button 
              onClick={handleSignOut} 
              className={cn(
                "w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-3 flex-wrap transition text-sm font-semibold border-sidebar-border bg-sidebar hover:bg-sidebar-accent/60 text-sidebar-foreground"
              )}
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 p-4 sm:p-6 max-w-[1600px] mx-auto w-full print:p-0 transition-colors duration-300">
        
        {/* Left Side: Catalog search & items (8 cols) */}
        <section className="lg:col-span-8 md:col-span-2 flex flex-col gap-4 sm:gap-6 print:hidden order-2 lg:order-1 lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6">
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
              "flex-1 rounded-2xl border p-8 sm:p-12 flex flex-col items-center justify-center gap-3 border-border bg-card shadow-card"
            )}>
              <RefreshCw className="size-6 sm:size-8 text-primary animate-spin" />
              <p className="text-muted-foreground text-xs sm:text-sm font-medium">Synchronizing live catalog database...</p>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className={cn(
              "flex-1 rounded-2xl border border-dashed p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-3 border-border bg-card shadow-card"
            )}>
              <AlertTriangle className="size-6 sm:size-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground">No parts matched your query</h3>
                <p className="text-muted-foreground text-xs mt-1">Try refining search terms.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pr-2 pb-10 flex-1 overflow-y-auto no-scrollbar">
              {/* Table Rows */}
              {filteredParts.map((part) => {
                const isOut = part.qty <= 0;
                
                // Calculate stock capacity and percentage using the item's initial stock when available.
                const baseStock = part.initial_qty > 0 ? part.initial_qty : Math.max(part.qty, part.threshold * 5, 20);
                const maxStock = Math.max(part.qty, baseStock);
                const stockPercentage = isOut ? 0 : Math.min(100, Math.max(0, Math.round((part.qty / maxStock) * 100)));
                
                return (
                  <div
                    key={part.id}
                    onClick={() => !isOut && addToCart(part)}
                    className={cn(
                      "flex flex-col gap-2 px-4 py-3 border hover:border-primary/40 hover:bg-accent/60 transition-all duration-200 cursor-pointer group",
                      "bg-card border-border rounded-lg",
                      isOut && "opacity-40 cursor-not-allowed hover:border-border hover:bg-card"
                    )}
                  >
                    <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                      <div className="flex items-center min-w-[120px] sm:min-w-[140px]">
                        <div className="font-semibold text-sm text-foreground group-hover:text-primary transition">
                          {part.name}
                        </div>
                      </div>
                      <div className="flex items-center min-w-[80px] sm:min-w-[100px]">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {part.sku}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MakeBadge make={part.make} />
                      </div>
                      <div className="flex items-center min-w-[60px]">
                        <span className="text-[11px] text-muted-foreground">
                          {part.model || 'Universal'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                          {part.category || 'Engine'}
                        </span>
                      </div>
                      <div className="flex items-center justify-end ml-auto">
                        <span className="font-bold text-sm text-primary">
                          ${Number(part.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                      {/* Quantity Display */}
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
                      
                      {/* Status Badge */}
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
                      
                      {/* Progress Bar */}
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
                      
                      {/* Percentage */}
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
        <section className="lg:col-span-4 md:col-span-2 flex flex-col gap-4 sm:gap-6 print:col-span-12 order-1 lg:order-2 lg:sticky lg:top-20 lg:self-start">
          
          {/* Current Sale Box */}
          <div className={cn(
            "rounded-2xl flex flex-col h-[400px] sm:h-[500px] backdrop-blur-md shadow-card print:border-none print:bg-white print:h-auto border bg-card border-border hover:border-primary/40 transition"
          )}>
            <div className={cn("p-4 sm:p-6 flex items-center justify-between border-b print:hidden border-border")}>
              <h3 className={cn("font-bold flex items-center gap-2 text-[15px] sm:text-[17px] text-foreground")}>
                <Package className="size-4 sm:size-5 text-primary" /> Current sale
              </h3>
              <span className="text-muted-foreground text-xs font-medium">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-sm print:hidden">
                  Add parts from the catalog
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.part.id} className={cn("flex items-center justify-between group print:border-b print:border-slate-300 print:pb-2")}>
                      <div className="flex flex-col">
                        <span className={cn("font-semibold text-sm group-hover:text-primary transition print:text-black text-foreground")}>
                          {item.part.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">{item.part.sku}</span>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-[11px] text-muted-foreground">${Number(item.part.price).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={cn("flex items-center gap-3 px-2 py-1 rounded-lg border print:hidden bg-card border-border")}>
                          <button onClick={() => updateQuantity(item.part.id, -1)} className="text-muted-foreground hover:text-foreground">
                            <Minus className="size-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.part.id, 1)} className="text-muted-foreground hover:text-foreground">
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <div className="hidden print:block text-xs text-black">Qty: {item.quantity}</div>
                        
                        <div className={cn("font-bold text-sm w-16 text-right print:text-black text-foreground")}>
                          ${(item.quantity * item.part.price).toFixed(2)}
                        </div>
                        <button onClick={() => removeFromCart(item.part.id)} className="text-muted-foreground hover:text-destructive print:hidden opacity-0 group-hover:opacity-100 transition">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={cn("p-4 sm:p-6 border-t flex flex-col gap-4 sm:gap-5 print:bg-white print:border-t-2 print:border-black border-border")}>
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground text-[12px] font-bold tracking-widest uppercase">Total</span>
                <span className={cn("font-bold text-4xl tracking-tight print:text-black text-foreground")}>
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={checkingOut || cart.length === 0}
                className="w-full py-4 rounded-xl gradient-primary text-primary-foreground font-semibold transition disabled:opacity-50 disabled:hover:opacity-50 flex items-center justify-center gap-2 print:hidden"
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

        {/* Daily Sales Table Section */}
        <section className="lg:col-span-12 md:col-span-2 mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card backdrop-blur-md print:hidden hover:border-primary/40 transition">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-primary text-[10px] sm:text-[11px] font-bold tracking-widest uppercase mb-1">Live Tracking</h3>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Daily Sales Register</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                Audit transactions processed through this terminal today.
              </p>
            </div>
            
            {/* Search Input for Daily Sales */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={dailySalesSearch}
                onChange={(e) => setDailySalesSearch(e.target.value)}
                placeholder="Search today's register..."
                className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-xs outline-none focus:border-primary transition text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Daily Stats Grid */}
          <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-card hover:border-primary/40 transition">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Today's Total Sales</span>
              <span className="font-display text-2xl font-extrabold text-primary mt-1">
                ${dailyStats.totalRevenue.toFixed(2)}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-card hover:border-primary/40 transition">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Parts Sold</span>
              <span className="font-display text-2xl font-extrabold text-foreground mt-1">
                {dailyStats.totalItems} <span className="text-xs font-normal text-muted-foreground">units</span>
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-card hover:border-primary/40 transition">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Transactions Logged</span>
              <span className="font-display text-2xl font-extrabold text-foreground mt-1">
                {dailyStats.totalTransactions} <span className="text-xs font-normal text-muted-foreground">sales</span>
              </span>
            </div>
          </div>

          {/* Daily Sales Table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase bg-muted/20">
                  <th className="p-3 tabular-nums">Time</th>
                  <th className="p-3">Transaction ID</th>
                  <th className="p-3">Items Sold</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-right">Tax (8%)</th>
                  <th className="p-3 text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDailySales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      {dailySales.length === 0 ? "No sales recorded today." : "No matching transactions found."}
                    </td>
                  </tr>
                ) : (
                  filteredDailySales.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-muted-foreground font-mono tabular-nums">
                        {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-mono font-semibold text-primary truncate max-w-[120px]">
                        {tx.id}
                      </td>
                      <td className="p-3 text-foreground">
                        <div className="flex flex-col gap-1 max-w-[280px] sm:max-w-[400px]">
                          {tx.items.map((item, idx) => (
                            <span key={idx} className="truncate">
                              {item.quantity}x {item.name}{" "}
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-sidebar-border ml-1">
                                {item.sku}
                              </span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-muted-foreground">
                        ${tx.subtotal.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-muted-foreground">
                        ${tx.tax.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-foreground tabular-nums">
                        ${tx.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* -------------------- SALES HISTORY DRAWER -------------------- */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end print:hidden">
          <div 
            onClick={() => setShowHistoryDrawer(false)} 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
          />
          
          <div className={cn("relative w-full max-w-md sm:max-w-md border-l h-full flex flex-col shadow-2xl animate-slide-left bg-sidebar border-sidebar-border")}>
            <div className={cn("p-4 sm:p-5 border-b flex items-center justify-between border-sidebar-border")}>
              <div>
                <h3 className={cn("font-bold text-base sm:text-lg flex items-center gap-2 text-foreground")}>
                  <Clock className="size-4 sm:size-5 text-primary" /> Sales Log History
                </h3>
              </div>
              <button 
                onClick={() => setShowHistoryDrawer(false)}
                className={cn("p-1 rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground")}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {salesHistory.map((tx) => (
                <div 
                  key={tx.id} 
                  className={cn("p-3 sm:p-4 rounded-xl border hover:border-primary/50 transition flex flex-col gap-2 cursor-pointer select-none group bg-muted border-sidebar-border")}
                  onClick={() => {
                    setActiveReceipt(tx);
                    setShowReceiptModal(true);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[11px] sm:text-xs font-bold text-primary">{tx.id}</span>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                      {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="text-[11px] sm:text-[12px] text-muted-foreground line-clamp-1 group-hover:text-foreground">
                    {tx.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 mt-1">
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">
                      {new Date(tx.date).toLocaleDateString()}
                    </span>
                    <span className={cn("font-mono text-xs sm:text-sm font-bold text-foreground")}>
                      ${tx.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={cn("p-4 sm:p-5 border-t border-sidebar-border")}>
              <button 
                onClick={() => {
                  if (confirm("Clear all sales history?")) {
                    setSalesHistory([]);
                    localStorage.removeItem("partspro-sales-history");
                    toast.success("Sales history cleared");
                  }
                }}
                className="w-full py-3 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition text-sm font-semibold"
              >
                Reset Sales Log History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- RECEIPT MODAL -------------------- */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div 
            onClick={() => setShowReceiptModal(false)} 
            className="absolute inset-0 bg-background/90 backdrop-blur-sm" 
          />
          
          <div className={cn("relative w-full max-w-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl animate-scale-in max-h-[90vh] flex flex-col justify-between print:static print:border-none print:shadow-none print:w-full print:max-w-none print:p-0 print:bg-white border bg-sidebar border-sidebar-border")}>
            
            <div className="overflow-y-auto space-y-3 sm:space-y-4 pr-1">
              <div className="flex flex-col items-center text-center gap-1.5 print:hidden">
                <div className="size-10 sm:size-12 rounded-full bg-success/10 border border-success/20 grid place-items-center mb-1">
                  <CheckCircle2 className="size-5 sm:size-6 text-success" />
                </div>
                <h3 className={cn("font-bold text-base sm:text-lg text-foreground")}>Transaction Succeeded</h3>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white text-black font-mono text-[11px] sm:text-xs shadow-inner flex flex-col gap-2 relative print:p-0 print:shadow-none">
                
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1 font-bold text-sm uppercase tracking-wider text-black">
                    <Wrench className="size-4" /> PartsPro Store
                  </div>
                  <div className="text-[11px] text-gray-500">Automotive Spare Parts POS Terminal</div>
                  <div className="text-[9px] text-gray-500">Date: {new Date(activeReceipt.date).toLocaleString()}</div>
                </div>

                <div className="border-b border-dashed border-gray-300 my-2 print:border-black" />

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <span className="font-bold">{activeReceipt.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Operator:</span>
                    <span className="truncate max-w-[150px]">{activeReceipt.cashier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-bold text-emerald-600">PAID</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-gray-300 my-2 print:border-black" />

                <div className="space-y-2 py-1">
                  <div className="flex text-[11px] font-bold text-gray-500 print:text-black">
                    <span className="flex-1">Description</span>
                    <span className="w-10 text-center">Qty</span>
                    <span className="w-16 text-right">Price</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {activeReceipt.items.map((item, idx) => (
                      <div key={idx} className="flex text-[11px]">
                        <div className="flex-1 truncate pr-1">
                          <div className="truncate font-medium">{item.name}</div>
                          <div className="text-[8px] text-gray-500 print:text-black">{item.sku}</div>
                        </div>
                        <span className="w-10 text-center font-bold">{item.quantity}</span>
                        <span className="w-16 text-right font-mono">${(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-b border-dashed border-gray-300 my-2 print:border-black" />

                <div className="space-y-1 text-[12px] font-mono">
                  <div className="flex justify-between text-gray-600 print:text-black">
                    <span>Subtotal:</span>
                    <span>${activeReceipt.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 print:text-black">
                    <span>Sales Tax (8%):</span>
                    <span>${activeReceipt.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-gray-300 mt-1 print:border-black">
                    <span>TOTAL COMPLETED:</span>
                    <span className="font-extrabold">${activeReceipt.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-gray-300 my-2 print:border-black" />

                <div className="text-center text-[11px] text-gray-500 py-1 font-semibold uppercase tracking-wider print:text-black">
                  *** Thank you for shopping! ***
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6 print:hidden">
              <button
                onClick={handlePrint}
                className="py-3 rounded-xl border border-sidebar-border hover:bg-sidebar-accent/60 text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Printer className="size-4" />
                Print Invoice
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setActiveReceipt(null);
                }}
                className="py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Sparkles className="size-4" />
                New Sale
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
