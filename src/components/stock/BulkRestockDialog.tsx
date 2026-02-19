import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { Package, Plus, Minus, Search, X, Truck, Receipt } from "lucide-react";

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
  addQty: number;
}

interface BulkRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onComplete: () => void;
}

const BulkRestockDialog = ({ open, onOpenChange, products, onComplete }: BulkRestockDialogProps) => {
  const isMobile = useIsMobile();
  const [selectedItems, setSelectedItems] = useState<BulkItem[]>([]);
  const [search, setSearch] = useState("");
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [expenseNotes, setExpenseNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.item_code && p.item_code.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleProduct = (productId: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.productId === productId);
      if (exists) return prev.filter(i => i.productId !== productId);
      return [...prev, { productId, addQty: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    setSelectedItems(prev =>
      prev.map(i => i.productId === productId ? { ...i, addQty: Math.max(1, qty) } : i)
    );
  };

  const totalUnits = selectedItems.reduce((sum, i) => sum + i.addQty, 0);
  const totalCost = totalUnits * unitPrice + shippingCost + otherExpenses;

  const handleBulkRestock = async () => {
    if (selectedItems.length === 0) return;
    if (unitPrice <= 0) {
      toast({ title: "Unit price required", description: "Enter the unit purchase price.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const item of selectedItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        const newQty = product.stock_quantity + item.addQty;
        const itemTotal = item.addQty * unitPrice + (shippingCost / selectedItems.length) + (otherExpenses / selectedItems.length);

        // Update product stock
        await supabase.from("products").update({ stock_quantity: newQty, in_stock: true }).eq("id", item.productId);

        // Record stock history
        await supabase.from("stock_history").insert({
          product_id: item.productId,
          previous_quantity: product.stock_quantity,
          new_quantity: newQty,
          change_amount: item.addQty,
          change_type: "restock",
          notes: `[Bulk Restock] ${expenseNotes || ""}`.trim(),
          unit_purchase_price: unitPrice,
          shipping_cost: Math.round((shippingCost / selectedItems.length) * 100) / 100,
          other_expenses: Math.round((otherExpenses / selectedItems.length) * 100) / 100,
          total_expense: Math.round(itemTotal * 100) / 100,
          created_by: user?.id || null,
        });

        // Create expense transaction
        await supabase.from("transactions").insert({
          type: "expense",
          category: "Inventory",
          amount: Math.round(itemTotal * 100) / 100,
          description: `[Bulk Restock] ${product.name}${expenseNotes ? ` - ${expenseNotes}` : ""}`,
          product_name: product.name,
          unit_purchase_price: unitPrice,
          shipping_cost: Math.round((shippingCost / selectedItems.length) * 100) / 100,
          other_costs: Math.round((otherExpenses / selectedItems.length) * 100) / 100,
          quantity: item.addQty,
          added_by: user?.id || null,
        });
      }

      toast({
        title: "Bulk Restock Complete",
        description: `${selectedItems.length} products restocked. Total: ${formatMVR(totalCost)}`,
      });

      setSelectedItems([]);
      setSearch("");
      setUnitPrice(0);
      setShippingCost(0);
      setOtherExpenses(0);
      setExpenseNotes("");
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Bulk restock failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const content = (
    <div className="flex flex-col h-full space-y-4">
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
        <div className="flex items-center justify-between px-3 py-2 bg-primary/10 rounded-xl text-sm">
          <span className="font-medium text-primary">{selectedItems.length} products selected</span>
          <button onClick={() => setSelectedItems([])} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>
        </div>
      )}

      {/* Product List */}
      <ScrollArea className="flex-1" style={{ maxHeight: isMobile ? "30vh" : "250px" }}>
        <div className="space-y-1.5">
          {filteredProducts.map(product => {
            const selected = selectedItems.find(i => i.productId === product.id);
            return (
              <div
                key={product.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  selected ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border/50 hover:bg-muted/50"
                }`}
                onClick={() => toggleProduct(product.id)}
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
                  </p>
                </div>
                {selected && (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => updateQty(product.id, selected.addQty - 1)}
                      className="p-1 bg-muted rounded hover:bg-muted/80"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={selected.addQty}
                      onChange={(e) => updateQty(product.id, parseInt(e.target.value) || 1)}
                      className="w-12 text-center text-sm bg-background border border-border rounded py-1"
                      min={1}
                    />
                    <button
                      onClick={() => updateQty(product.id, selected.addQty + 1)}
                      className="p-1 bg-muted rounded hover:bg-muted/80"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Cost Fields */}
      {selectedItems.length > 0 && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Receipt className="w-3.5 h-3.5" />
            Purchase Costs
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Unit Price <span className="text-destructive">*</span></label>
              <input
                type="number" min="0" step="0.01"
                value={unitPrice || ""}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Shipping</label>
              <input
                type="number" min="0" step="0.01"
                value={shippingCost || ""}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Other</label>
              <input
                type="number" min="0" step="0.01"
                value={otherExpenses || ""}
                onChange={(e) => setOtherExpenses(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <input
            type="text"
            value={expenseNotes}
            onChange={(e) => setExpenseNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          
          {totalCost > 0 && (
            <div className="p-2 bg-primary/10 rounded-lg text-sm">
              <span className="font-medium">Total: {formatMVR(totalCost)}</span>
              <span className="text-[10px] text-muted-foreground ml-2">
                ({totalUnits} units × {formatMVR(unitPrice)} + costs)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <button
        onClick={handleBulkRestock}
        disabled={saving || selectedItems.length === 0}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? "Processing..." : `Restock ${selectedItems.length} Products`}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Bulk Restock</SheetTitle>
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
          <DialogTitle>Bulk Restock</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default BulkRestockDialog;
