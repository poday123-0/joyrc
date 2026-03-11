import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { Package, Plus, Minus, Search, PackagePlus, PackageMinus, Receipt, Trash2, Check, ChevronDown, ChevronUp, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  stock_quantity: number;
  item_code?: string | null;
}

interface BulkItem {
  productId: string;
  qty: number;
  unitPrice: number;
  shippingCost: number;
  otherCosts: number;
  notes: string;
  removalReason: string;
}

interface BulkRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onComplete: () => void;
  inline?: boolean;
}

const REMOVAL_REASONS = [
  { value: "damaged", label: "Damaged", icon: "💔" },
  { value: "lost", label: "Lost / Missing", icon: "🔍" },
  { value: "returned_supplier", label: "Returned", icon: "📦" },
  { value: "expired", label: "Expired", icon: "⏰" },
  { value: "defective", label: "Defective", icon: "⚠️" },
  { value: "stolen", label: "Stolen", icon: "🚨" },
  { value: "sample", label: "Sample", icon: "🎁" },
  { value: "other", label: "Other", icon: "📝" },
];

const BulkRestockDialog = ({ open, onOpenChange, products, onComplete, inline = false }: BulkRestockDialogProps) => {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [selectedItems, setSelectedItems] = useState<BulkItem[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.item_code && p.item_code.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleProduct = (productId: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.productId === productId);
      if (exists) {
        setExpandedItem(null);
        return prev.filter(i => i.productId !== productId);
      }
      setExpandedItem(productId);
      return [...prev, { productId, qty: 1, unitPrice: 0, shippingCost: 0, otherCosts: 0, notes: "", removalReason: "" }];
    });
  };

  const updateItem = (productId: string, updates: Partial<BulkItem>) => {
    setSelectedItems(prev =>
      prev.map(i => i.productId === productId ? { ...i, ...updates } : i)
    );
  };

  const totalUnits = selectedItems.reduce((sum, i) => sum + i.qty, 0);
  const totalCost = selectedItems.reduce((sum, i) => sum + (i.unitPrice * i.qty) + i.shippingCost + i.otherCosts, 0);

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) return;

    if (mode === "add") {
      const missing = selectedItems.find(i => i.unitPrice <= 0);
      if (missing) {
        const p = products.find(pr => pr.id === missing.productId);
        toast({ title: "Unit price required", description: `Enter unit price for ${p?.name || "product"}.`, variant: "destructive" });
        setExpandedItem(missing.productId);
        return;
      }
    }

    if (mode === "remove") {
      const missing = selectedItems.find(i => !i.removalReason);
      if (missing) {
        const p = products.find(pr => pr.id === missing.productId);
        toast({ title: "Reason required", description: `Select a removal reason for ${p?.name || "product"}.`, variant: "destructive" });
        setExpandedItem(missing.productId);
        return;
      }
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const item of selectedItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        const changeAmount = mode === "add" ? item.qty : -item.qty;
        const newQty = Math.max(0, product.stock_quantity + changeAmount);
        const itemTotal = item.qty * (item.unitPrice + item.shippingCost + item.otherCosts);

        const updateData: any = { stock_quantity: newQty, in_stock: newQty > 0 };
        if (mode === "add" && item.unitPrice > 0) {
          updateData.cost_price = item.unitPrice;
        }
        await supabase.from("products").update(updateData).eq("id", item.productId);

        const reasonLabel = mode === "remove" ? REMOVAL_REASONS.find(r => r.value === item.removalReason)?.label || "" : "";
        const notesParts = [
          mode === "add" ? "[Bulk Restock]" : "[Bulk Remove]",
          reasonLabel ? `[${reasonLabel}]` : "",
          item.notes || "",
        ].filter(Boolean).join(" ");

        await supabase.from("stock_history").insert({
          product_id: item.productId,
          previous_quantity: product.stock_quantity,
          new_quantity: newQty,
          change_amount: changeAmount,
          change_type: mode === "add" ? "restock" : "adjustment",
          notes: notesParts,
          unit_purchase_price: mode === "add" ? item.unitPrice : null,
          shipping_cost: mode === "add" ? item.shippingCost : null,
          other_expenses: mode === "add" ? item.otherCosts : null,
          total_expense: mode === "add" ? Math.round(itemTotal * 100) / 100 : null,
          created_by: user?.id || null,
        });

        if (mode === "add" && itemTotal > 0) {
          await supabase.from("transactions").insert({
            type: "expense",
            category: "Inventory",
            amount: Math.round(itemTotal * 100) / 100,
            description: `[Bulk Restock] ${product.name}${item.notes ? ` - ${item.notes}` : ""}`,
            product_name: product.name,
            unit_purchase_price: item.unitPrice,
            shipping_cost: item.shippingCost,
            other_costs: item.otherCosts,
            quantity: item.qty,
            added_by: user?.id || null,
          });
        }
      }

      toast({
        title: mode === "add" ? "Bulk Restock Complete" : "Bulk Removal Complete",
        description: `${selectedItems.length} products updated. ${mode === "add" ? `Total: ${formatMVR(totalCost)}` : `${totalUnits} units removed`}`,
      });

      setSelectedItems([]);
      setSearch("");
      setExpandedItem(null);
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Bulk operation failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const content = (
    <div className="flex flex-col h-full space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-1.5 p-1.5 bg-muted/60 rounded-2xl border border-border/30">
        <button
          onClick={() => { setMode("add"); setSelectedItems([]); setExpandedItem(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            mode === "add" 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          Add Stock
        </button>
        <button
          onClick={() => { setMode("remove"); setSelectedItems([]); setExpandedItem(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            mode === "remove" 
              ? "bg-destructive text-destructive-foreground shadow-md" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <PackageMinus className="w-4 h-4" />
          Remove Stock
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or item code..."
          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Selected Summary Bar */}
      {selectedItems.length > 0 && (
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${
          mode === "add" 
            ? "bg-primary/8 dark:bg-primary/15 border-primary/20" 
            : "bg-destructive/8 dark:bg-destructive/15 border-destructive/20"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              mode === "add" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
            }`}>
              {selectedItems.length}
            </div>
            <span className="text-sm font-medium text-foreground">
              {selectedItems.length} product{selectedItems.length !== 1 ? "s" : ""} 
              <span className="text-muted-foreground font-normal"> • {totalUnits} units</span>
            </span>
          </div>
          <button 
            onClick={() => { setSelectedItems([]); setExpandedItem(null); }} 
            className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Product List */}
      <ScrollArea className="flex-1" style={{ maxHeight: inline ? "50vh" : (isMobile ? "45vh" : "420px") }}>
        <div className="space-y-1.5">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const selected = selectedItems.find(i => i.productId === product.id);
              const isExpanded = expandedItem === product.id && !!selected;
              const itemTotal = selected ? selected.qty * (selected.unitPrice + selected.shippingCost + selected.otherCosts) : 0;

              return (
                <div key={product.id} className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  selected
                    ? mode === "add" 
                      ? "bg-primary/5 dark:bg-primary/10 border-primary/25 ring-1 ring-primary/10" 
                      : "bg-destructive/5 dark:bg-destructive/10 border-destructive/25 ring-1 ring-destructive/10"
                    : "bg-card border-border/40 hover:border-border hover:bg-muted/30"
                }`}>
                  {/* Product Row */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => {
                      if (!selected) {
                        toggleProduct(product.id);
                      } else {
                        setExpandedItem(isExpanded ? null : product.id);
                      }
                    }}
                  >
                    {/* Selection checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selected
                        ? mode === "add"
                          ? "bg-primary border-primary"
                          : "bg-destructive border-destructive"
                        : "border-border/60 bg-background"
                    }`}>
                      {selected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>

                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/20">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Package className="w-4 h-4 text-muted-foreground/60" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">{product.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none ${
                          product.stock_quantity === 0
                            ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
                            : product.stock_quantity <= 5
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20"
                        }`}>
                          {product.stock_quantity} in stock
                        </span>
                        {product.item_code && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {product.item_code}
                          </span>
                        )}
                        {selected && mode === "add" && itemTotal > 0 && (
                          <span className="text-[10px] font-semibold text-primary ml-auto">{formatMVR(itemTotal)}</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    {selected ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => updateItem(product.id, { qty: Math.max(1, selected.qty - 1) })}
                          className="w-7 h-7 flex items-center justify-center bg-muted hover:bg-muted/70 rounded-lg transition-colors"
                        >
                          <Minus className="w-3 h-3 text-foreground" />
                        </button>
                        <input
                          type="number"
                          value={selected.qty}
                          onChange={(e) => updateItem(product.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-10 text-center text-xs font-bold bg-background border border-border rounded-lg py-1.5 text-foreground"
                          min={1}
                        />
                        <button
                          onClick={() => updateItem(product.id, { qty: selected.qty + 1 })}
                          className="w-7 h-7 flex items-center justify-center bg-muted hover:bg-muted/70 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3 text-foreground" />
                        </button>
                        <button
                          onClick={() => toggleProduct(product.id)}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors ml-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedItem(isExpanded ? null : product.id); }}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">Tap to select</span>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && selected && (
                    <div className="px-3 pb-3 pt-2 border-t border-border/30 bg-muted/20 space-y-3" onClick={e => e.stopPropagation()}>
                      {mode === "add" ? (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                                Unit Price <span className="text-destructive">*</span>
                              </label>
                              <input
                                type="number" min="0" step="0.01"
                                value={selected.unitPrice || ""}
                                onChange={(e) => updateItem(product.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                className="w-full px-2.5 py-2 bg-background border border-border rounded-lg text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Shipping</label>
                              <input
                                type="number" min="0" step="0.01"
                                value={selected.shippingCost || ""}
                                onChange={(e) => updateItem(product.id, { shippingCost: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                className="w-full px-2.5 py-2 bg-background border border-border rounded-lg text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Other</label>
                              <input
                                type="number" min="0" step="0.01"
                                value={selected.otherCosts || ""}
                                onChange={(e) => updateItem(product.id, { otherCosts: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                className="w-full px-2.5 py-2 bg-background border border-border rounded-lg text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                              />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={selected.notes}
                            onChange={(e) => updateItem(product.id, { notes: e.target.value })}
                            placeholder="Notes (optional)"
                            className="w-full px-2.5 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                          />
                          {itemTotal > 0 && (
                            <div className="flex items-center gap-2 text-[11px] bg-primary/8 dark:bg-primary/15 rounded-lg px-3 py-2 border border-primary/15">
                              <Receipt className="w-3.5 h-3.5 text-primary" />
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span className="font-bold text-foreground">{formatMVR(itemTotal)}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {selected.qty} × {formatMVR(selected.unitPrice + selected.shippingCost + selected.otherCosts)}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Reason for removal</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {REMOVAL_REASONS.map(reason => (
                              <button
                                key={reason.value}
                                onClick={() => updateItem(product.id, { removalReason: reason.value })}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                                  selected.removalReason === reason.value
                                    ? "bg-destructive/10 dark:bg-destructive/20 border-destructive/30 text-foreground font-semibold ring-1 ring-destructive/20"
                                    : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50 hover:border-border"
                                }`}
                              >
                                <span className="text-sm">{reason.icon}</span>
                                <span>{reason.label}</span>
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={selected.notes}
                            onChange={(e) => updateItem(product.id, { notes: e.target.value })}
                            placeholder="Additional notes (optional)"
                            className="w-full px-2.5 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Summary & Action */}
      <div className="space-y-3 pt-1">
        {selectedItems.length > 0 && mode === "add" && totalCost > 0 && (
          <div className="flex items-center justify-between p-3 bg-primary/8 dark:bg-primary/15 rounded-xl border border-primary/20">
            <div>
              <p className="text-xs text-muted-foreground">Grand Total</p>
              <p className="text-lg font-bold text-foreground">{formatMVR(totalCost)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">{totalUnits} units</p>
              <p className="text-[11px] text-muted-foreground">{selectedItems.length} products</p>
            </div>
          </div>
        )}

        {selectedItems.length > 0 && mode === "remove" && (
          <div className="flex items-center justify-between p-3 bg-destructive/8 dark:bg-destructive/15 rounded-xl border border-destructive/20">
            <div>
              <p className="text-xs text-muted-foreground">Total Removal</p>
              <p className="text-lg font-bold text-foreground">{totalUnits} units</p>
            </div>
            <p className="text-[11px] text-muted-foreground">{selectedItems.length} products</p>
          </div>
        )}

        <button
          onClick={handleBulkAction}
          disabled={saving || selectedItems.length === 0}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            mode === "add"
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98]"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg active:scale-[0.98]"
          }`}
        >
          {saving
            ? "Processing..."
            : mode === "add"
              ? selectedItems.length === 0 
                ? "Select products to restock" 
                : `Restock ${selectedItems.length} Product${selectedItems.length !== 1 ? "s" : ""}`
              : selectedItems.length === 0
                ? "Select products to remove"
                : `Remove from ${selectedItems.length} Product${selectedItems.length !== 1 ? "s" : ""}`
          }
        </button>
      </div>
    </div>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Package className="w-5 h-5 text-primary" />
            Bulk Stock Management
          </h3>
        </div>
        {content}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Bulk Stock Management</SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-full overflow-auto pb-8">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Stock Management</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default BulkRestockDialog;
