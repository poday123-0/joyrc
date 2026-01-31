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
  category_id: string | null;
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
  order_id: string | null;
  created_by: string | null;
  order?: { id: string } | null;
  profile?: { full_name: string | null } | null;
}

interface StockCosts {
  unitPurchasePrice: number;
  shippingCost: number;
  otherExpenses: number;
  expenseNotes: string;
}

interface Category {
  id: string;
  name: string;
}

const StockManagementTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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
    fetchCategories();
    checkSuperAdmin();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("sort_order");
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

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
        .select("id, name, image_url, price, stock_quantity, in_stock, category_id, category:categories(name)")
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
      // First get the history records
      const { data: historyData, error } = await supabase
        .from("stock_history")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch profile names for created_by users
      const historyWithProfiles = await Promise.all(
        (historyData || []).map(async (item) => {
          let profile = null;
          if (item.created_by) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", item.created_by)
              .single();
            profile = profileData;
          }
          return { ...item, profile };
        })
      );

      setStockHistory(historyWithProfiles);
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
        // Get current user for added_by field
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            type: "expense",
            category: "Inventory",
            amount: totalExpense,
            description: costs.expenseNotes || null,
            product_name: productName,
            unit_purchase_price: costs.unitPurchasePrice || null,
            shipping_cost: costs.shippingCost || null,
            other_costs: costs.otherExpenses || null,
            quantity: changeAmount,
            added_by: user?.id || null,
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

      // Reset all product stock quantities to 0
      const { error: resetError } = await supabase
        .from("products")
        .update({ stock_quantity: 0, in_stock: false })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all rows

      if (resetError) throw resetError;

      // Delete all stock history
      const { error: deleteError } = await supabase
        .from("stock_history")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows

      if (deleteError) throw deleteError;

      toast({
        title: "Stock & History Cleared",
        description: "All stock quantities reset to 0 and history deleted.",
      });

      setShowClearDialog(false);
      setClearPassword("");
      setStockHistory([]);
      fetchProducts(); // Refresh to show updated quantities
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear stock and history",
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

      {/* Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {outOfStockProducts.length > 0 && (
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-destructive">{outOfStockProducts.length}</span>
                    <span className="text-sm font-medium text-foreground">Out of Stock</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {outOfStockProducts.slice(0, 2).map(p => p.name).join(", ")}
                    {outOfStockProducts.length > 2 && ` +${outOfStockProducts.length - 2} more`}
                  </p>
                </div>
              </div>
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-amber-600">{lowStockProducts.length}</span>
                    <span className="text-sm font-medium text-foreground">Low Stock</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Products with ≤5 items remaining
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[150px]"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
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
              {/* Clickable Product Card */}
              <button
                onClick={() => handleExpandProduct(product.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/50 transition-colors text-left"
              >
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

                  {/* Expand Indicator */}
                  <div className="p-2 bg-muted rounded-lg">
                    {expandedProductId === product.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Section */}
              {expandedProductId === product.id && (
                <div className="p-4 bg-background border-t border-border space-y-4">
                  {/* Stock Adjustment */}
                  <div className="space-y-4">
                    {/* Quantity with +/- buttons */}
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Set Stock To</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const current = adjustmentAmount[product.id] ?? product.stock_quantity;
                              setAdjustmentAmount(prev => ({ 
                                ...prev, 
                                [product.id]: Math.max(0, current - 1)
                              }));
                            }}
                            disabled={saving === product.id || (adjustmentAmount[product.id] ?? product.stock_quantity) === 0}
                            className="p-2.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={adjustmentAmount[product.id] ?? product.stock_quantity}
                            onChange={(e) => setAdjustmentAmount(prev => ({ 
                              ...prev, 
                              [product.id]: parseInt(e.target.value) || 0 
                            }))}
                            placeholder="Qty"
                            className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const current = adjustmentAmount[product.id] ?? product.stock_quantity;
                              setAdjustmentAmount(prev => ({ 
                                ...prev, 
                                [product.id]: current + 1
                              }));
                            }}
                            disabled={saving === product.id}
                            className="p-2.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
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

                    {/* Cost Fields - Always visible when expanded */}
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

                    <button
                      onClick={() => handleSetStock(
                        product.id, 
                        product.stock_quantity, 
                        adjustmentAmount[product.id] ?? product.stock_quantity,
                        product.name
                      )}
                      disabled={saving === product.id || (adjustmentAmount[product.id] ?? product.stock_quantity) === product.stock_quantity}
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
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {stockHistory.map((item) => (
                          <div key={item.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col gap-1.5">
                                {/* Change badge and type */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    item.change_amount > 0 
                                      ? "bg-emerald-500/10 text-emerald-600" 
                                      : "bg-rose-500/10 text-rose-500"
                                  }`}>
                                    {item.change_amount > 0 ? "+" : ""}{item.change_amount}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    item.change_type === "sale" 
                                      ? "bg-blue-500/10 text-blue-600"
                                      : item.change_type === "restock"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-muted text-muted-foreground"
                                  }`}>
                                    {getChangeTypeLabel(item.change_type)}
                                  </span>
                                </div>
                                {/* Quantity change */}
                                <p className="text-xs text-muted-foreground">
                                  Stock: <span className="font-medium text-foreground">{item.previous_quantity}</span> → <span className="font-medium text-foreground">{item.new_quantity}</span>
                                </p>
                                {/* Order reference for sales */}
                                {item.order_id && item.change_type === "sale" && (
                                  <p className="text-xs text-blue-600">
                                    📦 Order #{item.order_id.slice(0, 8).toUpperCase()}
                                  </p>
                                )}
                                {/* Who made the change */}
                                {item.profile?.full_name && (
                                  <p className="text-xs text-muted-foreground">
                                    👤 {item.change_type === "sale" ? "Sold by" : "By"}: <span className="font-medium text-foreground">{item.profile.full_name}</span>
                                  </p>
                                )}
                                {/* Notes if available */}
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                              </div>
                            </div>
                            {/* Show cost details if available */}
                            {item.total_expense && item.total_expense > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-4 text-xs flex-wrap">
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
