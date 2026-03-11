import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { Package, Plus, Minus, Search, PackagePlus, PackageMinus, Receipt, Trash2 } from "lucide-react";

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
  const totalCost = selectedItems.reduce((sum, i) => sum + i.qty * (i.unitPrice + i.shippingCost + i.otherCosts), 0);

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

        // Update product stock
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

        // Record stock history
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

        // Create expense transaction (only for add mode with costs)
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
    <div className="flex flex-col h-full space-y-3">
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => { setMode("add"); setSelectedItems([]); setExpandedItem(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "add" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          Add Stock
        </button>
        <button
          onClick={() => { setMode("remove"); setSelectedItems([]); setExpandedItem(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "remove" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PackageMinus className="w-4 h-4" />
          Remove Stock
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Selected count */}
      {selectedItems.length > 0 && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${
          mode === "add" ? "bg-primary/10" : "bg-destructive/10"
        }`}>
          <span className={`font-medium ${mode === "add" ? "text-primary" : "text-destructive"}`}>
            {selectedItems.length} product{selectedItems.length !== 1 ? "s" : ""} selected • {totalUnits} units
          </span>
          <button onClick={() => { setSelectedItems([]); setExpandedItem(null); }} className="text-xs text-muted-foreground hover:text-foreground">
            Clear all
          </button>
        </div>
      )}

      {/* Product List */}
      <ScrollArea className="flex-1" style={{ maxHeight: inline ? "50vh" : (isMobile ? "40vh" : "400px") }}>
        <div className="space-y-1.5">
          {filteredProducts.map(product => {
            const selected = selectedItems.find(i => i.productId === product.id);
            const isExpanded = expandedItem === product.id && !!selected;
            const itemTotal = selected ? selected.qty * (selected.unitPrice + selected.shippingCost + selected.otherCosts) : 0;

            return (
              <div key={product.id} className={`rounded-xl border transition-colors ${
                selected
                  ? mode === "add" ? "bg-primary/5 border-primary/30" : "bg-destructive/5 border-destructive/30"
                  : "bg-muted/30 border-border/50 hover:bg-muted/50"
              }`}>
                {/* Product Row */}
                <div
                  className="flex items-center gap-3 p-2.5 cursor-pointer"
                  onClick={() => {
                    if (!selected) {
                      toggleProduct(product.id);
                    } else {
                      setExpandedItem(isExpanded ? null : product.id);
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Stock: {product.stock_quantity} {product.item_code && `• ${product.item_code}`}
                      {selected && mode === "add" && selected.unitPrice > 0 && (
                        <span className="ml-1 text-primary">• {formatMVR(itemTotal)}</span>
                      )}
                    </p>
                  </div>
                  {selected && (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => updateItem(product.id, { qty: Math.max(1, selected.qty - 1) })}
                        className="p-1 bg-muted rounded hover:bg-muted/80"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={selected.qty}
                        onChange={(e) => updateItem(product.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-12 text-center text-sm bg-background border border-border rounded py-1"
                        min={1}
                      />
                      <button
                        onClick={() => updateItem(product.id, { qty: selected.qty + 1 })}
                        className="p-1 bg-muted rounded hover:bg-muted/80"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => toggleProduct(product.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && selected && (
                  <div className="px-2.5 pb-2.5 space-y-2" onClick={e => e.stopPropagation()}>
                    {mode === "add" ? (
                      <>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-0.5">
                              Unit Price <span className="text-destructive">*</span>
                            </label>
                            <input
                              type="number" min="0" step="0.01"
                              value={selected.unitPrice || ""}
                              onChange={(e) => updateItem(product.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-0.5">Shipping</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={selected.shippingCost || ""}
                              onChange={(e) => updateItem(product.id, { shippingCost: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-0.5">Other</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={selected.otherCosts || ""}
                              onChange={(e) => updateItem(product.id, { otherCosts: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          value={selected.notes}
                          onChange={(e) => updateItem(product.id, { notes: e.target.value })}
                          placeholder="Notes (optional)"
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                        {itemTotal > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            Subtotal: <span className="font-medium text-foreground">{formatMVR(itemTotal)}</span>
                            {" "}({selected.qty} × {formatMVR(selected.unitPrice + selected.shippingCost + selected.otherCosts)})
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {REMOVAL_REASONS.map(reason => (
                            <button
                              key={reason.value}
                              onClick={() => updateItem(product.id, { removalReason: reason.value })}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] transition-all ${
                                selected.removalReason === reason.value
                                  ? "bg-destructive/10 border-destructive/30 text-foreground font-medium"
                                  : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                              }`}
                            >
                              <span>{reason.icon}</span>
                              <span>{reason.label}</span>
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={selected.notes}
                          onChange={(e) => updateItem(product.id, { notes: e.target.value })}
                          placeholder="Notes (optional)"
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Summary & Action */}
      {selectedItems.length > 0 && mode === "add" && totalCost > 0 && (
        <div className="p-2 bg-primary/10 rounded-lg text-sm">
          <span className="font-medium">Grand Total: {formatMVR(totalCost)}</span>
          <span className="text-[10px] text-muted-foreground ml-2">
            ({totalUnits} units across {selectedItems.length} products)
          </span>
        </div>
      )}

      <button
        onClick={handleBulkAction}
        disabled={saving || selectedItems.length === 0}
        className={`w-full py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 ${
          mode === "add"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        }`}
      >
        {saving
          ? "Processing..."
          : mode === "add"
            ? `Restock ${selectedItems.length} Product${selectedItems.length !== 1 ? "s" : ""}`
            : `Remove from ${selectedItems.length} Product${selectedItems.length !== 1 ? "s" : ""}`
        }
      </button>
    </div>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div className="space-y-3">
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
