import { useState, useEffect } from "react";
import { Package, Search, RefreshCw, Plus, Minus, History, AlertTriangle, ChevronDown, ChevronUp, DollarSign, Truck, Receipt, Trash2, ShieldAlert, X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  stock_quantity: number;
  in_stock: boolean;
  category?: { name: string } | null;
}

interface StockHistoryItem {
  id: string;
  product_id: string;
  previous_quantity: number;
  new_quantity: number;
  change_amount: number;
  change_type: string;
  notes: string | null;
  created_at: string;
  unit_purchase_price: number | null;
  shipping_cost: number | null;
  other_expenses: number | null;
  total_expense: number | null;
}

interface StockCosts {
  unitPurchasePrice: number;
  shippingCost: number;
  otherExpenses: number;
  expenseNotes: string;
}

const StockManagementTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState<Record<string, number>>({});
  const [adjustmentNotes, setAdjustmentNotes] = useState<Record<string, string>>({});
  const [stockCosts, setStockCosts] = useState<Record<string, StockCosts>>({});
  const [showCostFields, setShowCostFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  
  // Clear history state
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetchProducts();
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      setIsSuperAdmin(!!data);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, image_url, price, stock_quantity, in_stock, category:categories(name)")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const fetchStockHistory = async (productId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_history")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setStockHistory(data || []);
    } catch (error) {
      console.error("Error fetching stock history:", error);
    }
    setHistoryLoading(false);
  };

  const handleExpandProduct = (productId: string) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      setStockHistory([]);
    } else {
      setExpandedProductId(productId);
      fetchStockHistory(productId);
    }
  };

  const handleAdjustStock = async (productId: string, currentQty: number, change: number) => {
    const newQty = Math.max(0, currentQty + change);
    const notes = adjustmentNotes[productId] || null;
    
    setSaving(productId);
    try {
      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ 
          stock_quantity: newQty,
          in_stock: newQty > 0
        })
        .eq("id", productId);

      if (updateError) throw updateError;

      // Record history
      const { error: historyError } = await supabase
        .from("stock_history")
        .insert({
          product_id: productId,
          previous_quantity: currentQty,
          new_quantity: newQty,
          change_amount: change,
          change_type: change > 0 ? "restock" : "manual_adjustment",
          notes,
        });

      if (historyError) throw historyError;

      toast({ 
        title: "Stock Updated", 
        description: `Stock changed by ${change > 0 ? "+" : ""}${change}` 
      });
      
      // Reset inputs
      setAdjustmentAmount(prev => ({ ...prev, [productId]: 0 }));
      setAdjustmentNotes(prev => ({ ...prev, [productId]: "" }));
      
      fetchProducts();
      if (expandedProductId === productId) {
        fetchStockHistory(productId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update stock",
        variant: "destructive",
      });
    }
    setSaving(null);
  };

  const handleSetStock = async (productId: string, currentQty: number, newQty: number, productName: string) => {
    const notes = adjustmentNotes[productId] || null;
    const costs = stockCosts[productId];
    const isRestock = newQty > currentQty;
    const changeAmount = newQty - currentQty;
    
    // Calculate total expense
    let totalExpense = 0;
    if (costs && isRestock) {
      const purchaseTotal = (costs.unitPurchasePrice || 0) * changeAmount;
      totalExpense = purchaseTotal + (costs.shippingCost || 0) + (costs.otherExpenses || 0);
    }
    
    setSaving(productId);
    try {
      const { error: updateError } = await supabase
        .from("products")
        .update({ 
          stock_quantity: newQty,
          in_stock: newQty > 0
        })
        .eq("id", productId);

      if (updateError) throw updateError;

      // Record stock history with costs
      const historyData: any = {
        product_id: productId,
        previous_quantity: currentQty,
        new_quantity: newQty,
        change_amount: changeAmount,
        change_type: isRestock ? "restock" : "manual_adjustment",
        notes,
      };

      // Add cost data if this is a restock with costs
      if (costs && isRestock && totalExpense > 0) {
        historyData.unit_purchase_price = costs.unitPurchasePrice || null;
        historyData.shipping_cost = costs.shippingCost || null;
        historyData.other_expenses = costs.otherExpenses || null;
        historyData.expense_notes = costs.expenseNotes || null;
        historyData.total_expense = totalExpense;
      }

      const { error: historyError } = await supabase
        .from("stock_history")
        .insert(historyData);

      if (historyError) throw historyError;

      // Auto-create expense transaction if there are costs
      if (costs && isRestock && totalExpense > 0) {
        const expenseDescription = `Stock purchase: ${productName} (${changeAmount} units @ ${formatMVR(costs.unitPurchasePrice || 0)})${costs.shippingCost ? ` + Shipping: ${formatMVR(costs.shippingCost)}` : ""}${costs.otherExpenses ? ` + Other: ${formatMVR(costs.otherExpenses)}` : ""}`;
        
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            type: "expense",
            category: "inventory",
            amount: totalExpense,
            description: costs.expenseNotes || expenseDescription,
          });

        if (transactionError) {
          console.error("Failed to create transaction:", transactionError);
        }
      }

      toast({ 
        title: "Stock Updated",
        description: totalExpense > 0 
          ? `Added ${changeAmount} units. Expense of ${formatMVR(totalExpense)} recorded.`
          : undefined
      });
      
      // Reset all inputs
      setAdjustmentAmount(prev => ({ ...prev, [productId]: 0 }));
      setAdjustmentNotes(prev => ({ ...prev, [productId]: "" }));
      setStockCosts(prev => ({ ...prev, [productId]: { unitPurchasePrice: 0, shippingCost: 0, otherExpenses: 0, expenseNotes: "" } }));
      setShowCostFields(prev => ({ ...prev, [productId]: false }));
      
      fetchProducts();
      if (expandedProductId === productId) {
        fetchStockHistory(productId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update stock",
        variant: "destructive",
      });
    }
    setSaving(null);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClearAllHistory = async () => {
    if (!clearPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm.",
        variant: "destructive",
      });
      return;
    }

    setClearing(true);
    try {
      // Verify password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User not found");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: clearPassword,
      });

      if (signInError) {
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
        setClearing(false);
        return;
      }

      // Delete all stock history
      const { error: deleteError } = await supabase
        .from("stock_history")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows

      if (deleteError) throw deleteError;

      toast({
        title: "History Cleared",
        description: "All stock history has been deleted.",
      });

      setShowClearDialog(false);
      setClearPassword("");
      setStockHistory([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear history",
        variant: "destructive",
      });
    }
    setClearing(false);
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case "restock": return "Restock";
      case "sale": return "Sale";
      case "manual_adjustment": return "Manual";
      case "initial": return "Initial";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Stock Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage product inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setShowClearDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          )}
          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Clear History Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Clear All Stock History</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
              <button
                onClick={() => { setShowClearDialog(false); setClearPassword(""); }}
                className="ml-auto p-2 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Enter your Super Admin password to confirm deletion of all stock history records.
            </p>
            
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                value={clearPassword}
                onChange={(e) => setClearPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowClearDialog(false); setClearPassword(""); }}
                className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                disabled={clearing || !clearPassword.trim()}
                className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Clear All History"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-xl">
          <p className="text-2xl font-bold text-foreground">{products.length}</p>
          <p className="text-sm text-muted-foreground">Total Products</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-xl">
          <p className="text-2xl font-bold text-primary">
            {products.reduce((sum, p) => sum + p.stock_quantity, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Total Stock</p>
        </div>
        <div className="p-4 bg-amber-500/10 rounded-xl">
          <p className="text-2xl font-bold text-amber-500">{lowStockProducts.length}</p>
          <p className="text-sm text-muted-foreground">Low Stock</p>
        </div>
        <div className="p-4 bg-destructive/10 rounded-xl">
          <p className="text-2xl font-bold text-destructive">{outOfStockProducts.length}</p>
          <p className="text-sm text-muted-foreground">Out of Stock</p>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="space-y-2">
          {outOfStockProducts.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                {outOfStockProducts.length} product(s) out of stock: {outOfStockProducts.slice(0, 3).map(p => p.name).join(", ")}
                {outOfStockProducts.length > 3 && ` and ${outOfStockProducts.length - 3} more`}
              </p>
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-600">
                {lowStockProducts.length} product(s) with low stock (≤5 items)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No products found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.category?.name || "Uncategorized"} • {formatMVR(product.price)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Stock Display */}
                  <div className={`px-3 py-1.5 rounded-lg text-center min-w-[80px] ${
                    product.stock_quantity === 0
                      ? "bg-destructive/10 text-destructive"
                      : product.stock_quantity <= 5
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-primary/10 text-primary"
                  }`}>
                    <p className="text-lg font-bold">{product.stock_quantity}</p>
                    <p className="text-xs">in stock</p>
                  </div>

                  {/* Quick Adjust Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAdjustStock(product.id, product.stock_quantity, -1)}
                      disabled={saving === product.id || product.stock_quantity === 0}
                      className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAdjustStock(product.id, product.stock_quantity, 1)}
                      disabled={saving === product.id}
                      className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => handleExpandProduct(product.id)}
                    className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    {expandedProductId === product.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Section */}
              {expandedProductId === product.id && (
                <div className="p-4 bg-background border-t border-border space-y-4">
                  {/* Bulk Adjustment */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Set Stock To</label>
                        <input
                          type="number"
                          min="0"
                          value={adjustmentAmount[product.id] || ""}
                          onChange={(e) => setAdjustmentAmount(prev => ({ 
                            ...prev, 
                            [product.id]: parseInt(e.target.value) || 0 
                          }))}
                          placeholder="Qty"
                          className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                        <input
                          type="text"
                          value={adjustmentNotes[product.id] || ""}
                          onChange={(e) => setAdjustmentNotes(prev => ({ 
                            ...prev, 
                            [product.id]: e.target.value 
                          }))}
                          placeholder="Reason for adjustment"
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    {/* Cost Fields Toggle */}
                    {(adjustmentAmount[product.id] || 0) > product.stock_quantity && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowCostFields(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
                          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                        >
                          <Receipt className="w-4 h-4" />
                          {showCostFields[product.id] ? "Hide" : "Add"} Purchase Costs & Expenses
                        </button>

                        {showCostFields[product.id] && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Unit Purchase Price
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={stockCosts[product.id]?.unitPurchasePrice || ""}
                                onChange={(e) => setStockCosts(prev => ({ 
                                  ...prev, 
                                  [product.id]: {
                                    ...prev[product.id],
                                    unitPurchasePrice: parseFloat(e.target.value) || 0,
                                    shippingCost: prev[product.id]?.shippingCost || 0,
                                    otherExpenses: prev[product.id]?.otherExpenses || 0,
                                    expenseNotes: prev[product.id]?.expenseNotes || ""
                                  }
                                }))}
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                Shipping Cost
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={stockCosts[product.id]?.shippingCost || ""}
                                onChange={(e) => setStockCosts(prev => ({ 
                                  ...prev, 
                                  [product.id]: {
                                    ...prev[product.id],
                                    unitPurchasePrice: prev[product.id]?.unitPurchasePrice || 0,
                                    shippingCost: parseFloat(e.target.value) || 0,
                                    otherExpenses: prev[product.id]?.otherExpenses || 0,
                                    expenseNotes: prev[product.id]?.expenseNotes || ""
                                  }
                                }))}
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Receipt className="w-3 h-3" />
                                Other Expenses
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={stockCosts[product.id]?.otherExpenses || ""}
                                onChange={(e) => setStockCosts(prev => ({ 
                                  ...prev, 
                                  [product.id]: {
                                    ...prev[product.id],
                                    unitPurchasePrice: prev[product.id]?.unitPurchasePrice || 0,
                                    shippingCost: prev[product.id]?.shippingCost || 0,
                                    otherExpenses: parseFloat(e.target.value) || 0,
                                    expenseNotes: prev[product.id]?.expenseNotes || ""
                                  }
                                }))}
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="block text-xs text-muted-foreground mb-1">
                                Expense Description (optional)
                              </label>
                              <input
                                type="text"
                                value={stockCosts[product.id]?.expenseNotes || ""}
                                onChange={(e) => setStockCosts(prev => ({ 
                                  ...prev, 
                                  [product.id]: {
                                    ...prev[product.id],
                                    unitPurchasePrice: prev[product.id]?.unitPurchasePrice || 0,
                                    shippingCost: prev[product.id]?.shippingCost || 0,
                                    otherExpenses: prev[product.id]?.otherExpenses || 0,
                                    expenseNotes: e.target.value
                                  }
                                }))}
                                placeholder="e.g., Supplier invoice #123, customs fees, etc."
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                            
                            {/* Total Expense Preview */}
                            {(() => {
                              const costs = stockCosts[product.id];
                              const changeAmount = (adjustmentAmount[product.id] || 0) - product.stock_quantity;
                              if (!costs || changeAmount <= 0) return null;
                              const purchaseTotal = (costs.unitPurchasePrice || 0) * changeAmount;
                              const totalExpense = purchaseTotal + (costs.shippingCost || 0) + (costs.otherExpenses || 0);
                              if (totalExpense <= 0) return null;
                              return (
                                <div className="sm:col-span-3 p-2 bg-primary/10 rounded-lg">
                                  <p className="text-sm text-foreground">
                                    <span className="font-medium">Total Expense:</span> {formatMVR(totalExpense)}
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({changeAmount} units × {formatMVR(costs.unitPurchasePrice || 0)} + shipping + other)
                                    </span>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    This will be automatically added to Transactions as an expense.
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleSetStock(
                        product.id, 
                        product.stock_quantity, 
                        adjustmentAmount[product.id] || 0,
                        product.name
                      )}
                      disabled={saving === product.id || adjustmentAmount[product.id] === undefined}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving === product.id ? "Saving..." : "Update Stock"}
                    </button>
                  </div>

                  {/* Stock History */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <History className="w-4 h-4" />
                      Stock History
                    </h4>
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : stockHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No history recorded yet</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {stockHistory.map((item) => (
                          <div key={item.id} className="p-2 bg-muted/50 rounded-lg text-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  item.change_amount > 0 
                                    ? "bg-emerald-500/10 text-emerald-600" 
                                    : "bg-rose-500/10 text-rose-500"
                                }`}>
                                  {item.change_amount > 0 ? "+" : ""}{item.change_amount}
                                </span>
                                <span className="text-muted-foreground">
                                  {item.previous_quantity} → {item.new_quantity}
                                </span>
                                <span className="px-2 py-0.5 bg-muted rounded text-xs">
                                  {getChangeTypeLabel(item.change_type)}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{item.notes}</p>
                                )}
                              </div>
                            </div>
                            {/* Show cost details if available */}
                            {item.total_expense && item.total_expense > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-4 text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {formatMVR(item.unit_purchase_price || 0)}/unit
                                </span>
                                {item.shipping_cost && item.shipping_cost > 0 && (
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Truck className="w-3 h-3" />
                                    {formatMVR(item.shipping_cost)}
                                  </span>
                                )}
                                {item.other_expenses && item.other_expenses > 0 && (
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Receipt className="w-3 h-3" />
                                    {formatMVR(item.other_expenses)}
                                  </span>
                                )}
                                <span className="font-medium text-primary ml-auto">
                                  Total: {formatMVR(item.total_expense)}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockManagementTab;
