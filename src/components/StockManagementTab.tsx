import { useState, useEffect } from "react";

import { Package, Search, RefreshCw, Plus, Minus, History, AlertTriangle, ChevronDown, ChevronUp, DollarSign, Truck, Receipt, Trash2, ShieldAlert, X, Eye, EyeOff, Hash, Palette, BarChart3, Boxes, PackageMinus, PackagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import ConfirmDialog from "@/components/ConfirmDialog";
import { StockHistoryDialog } from "@/components/StockHistoryDialog";
import StockAnalytics from "@/components/stock/StockAnalytics";
import BulkRestockDialog from "@/components/stock/BulkRestockDialog";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  in_stock: boolean;
  category_id: string | null;
  category?: { name: string } | null;
  item_code?: string | null;
  hidden_from_shop?: boolean;
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

interface ProductColor {
  id: string;
  color_name: string;
  color_hex: string;
  stock_quantity: number;
  cost_price: number | null;
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
  const [itemCodeSearch, setItemCodeSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState<Record<string, number>>({});
  const [adjustmentNotes, setAdjustmentNotes] = useState<Record<string, string>>({});
  const [stockCosts, setStockCosts] = useState<Record<string, StockCosts>>({});
  const [showCostFields, setShowCostFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [productColors, setProductColors] = useState<Record<string, ProductColor[]>>({});
  const [selectedColorId, setSelectedColorId] = useState<Record<string, string>>({});
  
  // Clear history state
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Delete individual history item state
  const [deleteHistoryId, setDeleteHistoryId] = useState<string | null>(null);
  const [deleteHistoryProductId, setDeleteHistoryProductId] = useState<string | null>(null);
  const [deletingHistory, setDeletingHistory] = useState(false);
  
  // Stock history dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDialogProductName, setHistoryDialogProductName] = useState("");
  
  // New feature states
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [bulkRestockOpen, setBulkRestockOpen] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [isGlobalHistoryView, setIsGlobalHistoryView] = useState(false);
  const [stockMode, setStockMode] = useState<Record<string, "add" | "remove">>({});
  const [removalReason, setRemovalReason] = useState<Record<string, string>>({});

  const REMOVAL_REASONS = [
    { value: "damaged", label: "Damaged", icon: "💔" },
    { value: "lost", label: "Lost / Missing", icon: "🔍" },
    { value: "returned_supplier", label: "Returned to Supplier", icon: "📦" },
    { value: "expired", label: "Expired", icon: "⏰" },
    { value: "defective", label: "Defective", icon: "⚠️" },
    { value: "stolen", label: "Stolen", icon: "🚨" },
    { value: "sample", label: "Given as Sample", icon: "🎁" },
    { value: "other", label: "Other", icon: "📝" },
  ];

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
        .select("id, name, image_url, price, cost_price, stock_quantity, in_stock, category_id, item_code, hidden_from_shop, category:categories(name)")
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

  const fetchStockHistory = async (productId: string, productInfo?: { name: string; item_code: string | null }) => {
    setHistoryLoading(true);
    try {
      // First get the history records
      const { data: historyData, error } = await supabase
        .from("stock_history")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(50);

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
          return { 
            ...item, 
            profile,
            product_name: productInfo?.name,
            product_item_code: productInfo?.item_code
          };
        })
      );

      setStockHistory(historyWithProfiles);
    } catch (error) {
      console.error("Error fetching stock history:", error);
    }
    setHistoryLoading(false);
  };

  const fetchAllStockHistory = async () => {
    setHistoryLoading(true);
    try {
      // Fetch all history records with product info
      const { data: historyData, error } = await supabase
        .from("stock_history")
        .select("*, products:product_id(name, item_code)")
        .order("created_at", { ascending: false })
        .limit(100);

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
          return { 
            ...item, 
            profile,
            product_name: (item.products as any)?.name,
            product_item_code: (item.products as any)?.item_code
          };
        })
      );

      setStockHistory(historyWithProfiles);
    } catch (error) {
      console.error("Error fetching all stock history:", error);
    }
    setHistoryLoading(false);
  };

  const fetchProductColors = async (productId: string) => {
    if (productColors[productId]) return; // Already fetched
    
    const { data } = await supabase
      .from("product_colors")
      .select("id, color_name, color_hex, stock_quantity, cost_price")
      .eq("product_id", productId)
      .order("sort_order");
    
    if (data) {
      setProductColors(prev => ({ ...prev, [productId]: data }));
    }
  };

  const handleExpandProduct = async (productId: string) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      setStockHistory([]);
    } else {
      setExpandedProductId(productId);
      const product = products.find(p => p.id === productId);
      fetchStockHistory(productId, product ? { name: product.name, item_code: product.item_code || null } : undefined);
      fetchProductColors(productId);
      
      // Load last used costs for this product if not already set
      if (!stockCosts[productId]) {
        const { data: lastRestock } = await supabase
          .from("stock_history")
          .select("unit_purchase_price, shipping_cost, other_expenses, expense_notes")
          .eq("product_id", productId)
          .eq("change_type", "restock")
          .not("unit_purchase_price", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (lastRestock) {
          setStockCosts(prev => ({
            ...prev,
            [productId]: {
              unitPurchasePrice: lastRestock.unit_purchase_price || 0,
              shippingCost: lastRestock.shipping_cost || 0,
              otherExpenses: lastRestock.other_expenses || 0,
              expenseNotes: lastRestock.expense_notes || ""
            }
          }));
        }
      }
    }
  };


  const handleSetStock = async (productId: string, currentQty: number, changeQty: number, productName: string) => {
    const mode = stockMode[productId] || "add";
    const changeAmount = mode === "add" ? changeQty : -changeQty;
    const newQty = currentQty + changeAmount;
    
    if (newQty < 0) {
      toast({ title: "Cannot remove more than available", description: `Only ${currentQty} units in stock.`, variant: "destructive" });
      return;
    }
    if (changeQty === 0) return;

    // Validate: Color must be selected if product has color variants
    const hasColors = productColors[productId] && productColors[productId].length > 0;
    if (hasColors && !selectedColorId[productId]) {
      toast({ title: "Select a Color", description: "Please select a color variant before adding or removing stock.", variant: "destructive" });
      return;
    }

    const isRestock = mode === "add";
    const costs = stockCosts[productId];
    
    // Validate: Unit price is required when restocking
    if (isRestock && (!costs || !costs.unitPurchasePrice || costs.unitPurchasePrice <= 0)) {
      toast({
        title: "Unit Purchase Price Required",
        description: "Please enter the unit purchase price before adding stock.",
        variant: "destructive",
      });
      return;
    }

    // Validate: Removal reason required when removing
    if (!isRestock && !removalReason[productId]) {
      toast({ title: "Reason Required", description: "Please select a reason for removing stock.", variant: "destructive" });
      return;
    }

    const selectedColor = selectedColorId[productId] 
      ? productColors[productId]?.find(c => c.id === selectedColorId[productId])
      : null;
    const colorNote = selectedColor ? `[Color: ${selectedColor.color_name}] ` : "";
    const reasonLabel = !isRestock ? REMOVAL_REASONS.find(r => r.value === removalReason[productId])?.label || "" : "";
    const userNote = adjustmentNotes[productId] || "";
    const notes = (colorNote + (reasonLabel ? `[${reasonLabel}] ` : "") + userNote).trim() || null;

    // Calculate total expense
    let totalExpense = 0;
    if (costs && isRestock) {
      const perUnit = (costs.unitPurchasePrice || 0) + (costs.shippingCost || 0) + (costs.otherExpenses || 0);
      totalExpense = perUnit * Math.abs(changeAmount);
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

      // Update color-specific stock if a color is selected
      if (selectedColor) {
        const colorNewQty = selectedColor.stock_quantity + changeAmount;
        const colorUpdate: any = { stock_quantity: Math.max(0, colorNewQty) };
        // Also update color cost_price when restocking
        if (isRestock && costs?.unitPurchasePrice) {
          colorUpdate.cost_price = costs.unitPurchasePrice;
        }
        const { error: colorError } = await supabase
          .from("product_colors")
          .update(colorUpdate)
          .eq("id", selectedColor.id);
        
        if (colorError) throw colorError;
        
        // Update local state
        setProductColors(prev => ({
          ...prev,
          [productId]: prev[productId]?.map(c => 
            c.id === selectedColor.id 
              ? { ...c, stock_quantity: Math.max(0, colorNewQty), cost_price: colorUpdate.cost_price ?? c.cost_price }
              : c
          ) || []
        }));
      }

      // Update cost_price on the product if this is a restock
      if (isRestock && costs?.unitPurchasePrice) {
        await supabase
          .from("products")
          .update({ cost_price: costs.unitPurchasePrice })
          .eq("id", productId);
      }

      // Record stock history with costs
      const historyData: any = {
        product_id: productId,
        previous_quantity: currentQty,
        new_quantity: newQty,
        change_amount: changeAmount,
        change_type: isRestock ? "restock" : "stock_removal",
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
        title: isRestock ? "Stock Added" : "Stock Removed",
        description: isRestock
          ? `Added ${Math.abs(changeAmount)} units${selectedColor ? ` (${selectedColor.color_name})` : ''}${totalExpense > 0 ? `. Expense of ${formatMVR(totalExpense)} recorded.` : ''}`
          : `Removed ${Math.abs(changeAmount)} units${selectedColor ? ` (${selectedColor.color_name})` : ''}. Reason: ${reasonLabel}`
      });
      
      // Reset all inputs
      setAdjustmentAmount(prev => ({ ...prev, [productId]: 0 }));
      setAdjustmentNotes(prev => ({ ...prev, [productId]: "" }));
      setSelectedColorId(prev => ({ ...prev, [productId]: "" }));
      setStockCosts(prev => ({ ...prev, [productId]: { unitPurchasePrice: 0, shippingCost: 0, otherExpenses: 0, expenseNotes: "" } }));
      setShowCostFields(prev => ({ ...prev, [productId]: false }));
      setRemovalReason(prev => ({ ...prev, [productId]: "" }));
      
      fetchProducts();
      if (expandedProductId === productId) {
        const product = products.find(p => p.id === productId);
        fetchStockHistory(productId, product ? { name: product.name, item_code: product.item_code || null } : undefined);
        // Refresh colors to get updated stock
        setProductColors(prev => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
        fetchProductColors(productId);
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
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.item_code && p.item_code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesItemCode = !itemCodeSearch.trim() || 
      (p.item_code && p.item_code.toLowerCase().includes(itemCodeSearch.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
    const matchesStockFilter = stockFilter === "all" || 
      (stockFilter === "low" && p.stock_quantity > 0 && p.stock_quantity <= lowStockThreshold) ||
      (stockFilter === "out" && p.stock_quantity === 0);
    return matchesSearch && matchesItemCode && matchesCategory && matchesStockFilter;
  });

  const lowStockProducts = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= lowStockThreshold);
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

      // Also reset all color variant stock quantities to 0
      const { error: colorResetError } = await supabase
        .from("product_colors")
        .update({ stock_quantity: 0, cost_price: 0 })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (colorResetError) throw colorResetError;

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

  const handleDeleteHistoryItem = async () => {
    if (!deleteHistoryId) return;
    
    setDeletingHistory(true);
    try {
      const { error } = await supabase
        .from("stock_history")
        .delete()
        .eq("id", deleteHistoryId);
      
      if (error) throw error;
      
      toast({ title: "History entry deleted" });
      setDeleteHistoryId(null);
      
      // Refresh history for the current product
      if (deleteHistoryProductId) {
        const product = products.find(p => p.id === deleteHistoryProductId);
        fetchStockHistory(deleteHistoryProductId, product ? { name: product.name, item_code: product.item_code || null } : undefined);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete history entry",
        variant: "destructive",
      });
    }
    setDeletingHistory(false);
    setDeleteHistoryProductId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Stock Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track and manage product inventory
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setShowClearDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Clear History</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}
          <button
            onClick={fetchProducts}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => {
              setIsGlobalHistoryView(true);
              setHistoryDialogProductName("All Products");
              fetchAllStockHistory();
              setHistoryDialogOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">All History</span>
          </button>
          <button
            onClick={() => setBulkRestockOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 transition-colors"
          >
            <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Bulk Restock</span>
            <span className="sm:hidden">Bulk</span>
          </button>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
              showAnalytics ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <StockAnalytics products={products} />
      )}

      {/* Bulk Restock Dialog */}
      <BulkRestockDialog
        open={bulkRestockOpen}
        onOpenChange={setBulkRestockOpen}
        products={products}
        onComplete={fetchProducts}
      />

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

      {/* Stats - Compact on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <div className="p-2 sm:p-4 bg-muted/30 rounded-lg sm:rounded-xl text-center sm:text-left">
          <p className="text-lg sm:text-2xl font-bold text-foreground">{products.length}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Products</p>
        </div>
        <div className="p-2 sm:p-4 bg-muted/30 rounded-lg sm:rounded-xl text-center sm:text-left">
          <p className="text-lg sm:text-2xl font-bold text-primary">
            {products.reduce((sum, p) => sum + p.stock_quantity, 0)}
          </p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Total Stock</p>
        </div>
        <button
          onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")}
          className={`p-2 sm:p-4 rounded-lg sm:rounded-xl text-center sm:text-left transition-all ${
            stockFilter === "low" 
              ? "bg-amber-500/20 ring-2 ring-amber-500" 
              : "bg-amber-500/10 hover:bg-amber-500/15"
          }`}
        >
          <p className="text-lg sm:text-2xl font-bold text-amber-500">{lowStockProducts.length}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Low (≤{lowStockThreshold})</p>
        </button>
        <button
          onClick={() => setStockFilter(stockFilter === "out" ? "all" : "out")}
          className={`p-2 sm:p-4 rounded-lg sm:rounded-xl text-center sm:text-left transition-all ${
            stockFilter === "out" 
              ? "bg-destructive/20 ring-2 ring-destructive" 
              : "bg-destructive/10 hover:bg-destructive/15"
          }`}
        >
          <p className="text-lg sm:text-2xl font-bold text-destructive">{outOfStockProducts.length}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Out</p>
        </button>
        {/* Threshold Setting */}
        <div className="p-2 sm:p-4 bg-muted/30 rounded-lg sm:rounded-xl text-center sm:text-left">
          <label className="text-[10px] sm:text-xs text-muted-foreground block mb-1">Low Threshold</label>
          <select
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(parseInt(e.target.value))}
            className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {[3, 5, 10, 15, 20, 25, 50].map(v => (
              <option key={v} value={v}>≤ {v} units</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Alerts - Compact on mobile */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {outOfStockProducts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/5 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-xs sm:text-sm">
                <span className="font-bold text-destructive">{outOfStockProducts.length}</span>
                <span className="text-foreground ml-1">Out of Stock</span>
              </span>
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm">
                <span className="font-bold text-amber-600">{lowStockProducts.length}</span>
                <span className="text-foreground ml-1">Low Stock</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search and Category Filter - Stacked on mobile */}
      <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-32 sm:flex-none">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Code"
              value={itemCodeSearch}
              onChange={(e) => setItemCodeSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 sm:py-2.5 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 sm:py-2.5 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 sm:min-w-[150px]"
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
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
        <div className="space-y-2 sm:space-y-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-muted/30 rounded-lg sm:rounded-xl border border-border/50 overflow-hidden">
              {/* Clickable Product Card - Optimized for mobile */}
              <button
                onClick={() => handleExpandProduct(product.id)}
                className="w-full flex items-center justify-between p-3 sm:p-4 gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm sm:text-base text-foreground truncate">{product.name}</p>
                      {product.hidden_from_shop && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 text-[9px] rounded-full font-medium">Hidden</span>
                      )}
                    </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {product.category?.name || "Uncategorized"} • Sale: {formatMVR(product.price)}
                        {product.cost_price ? ` • Cost: ${formatMVR(product.cost_price)}` : ""}
                      </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  {/* Stock Display - Compact on mobile */}
                  <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-center min-w-[50px] sm:min-w-[80px] ${
                    product.stock_quantity === 0
                      ? "bg-destructive/10 text-destructive"
                      : product.stock_quantity <= 5
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-primary/10 text-primary"
                  }`}>
                    <p className="text-base sm:text-lg font-bold">{product.stock_quantity}</p>
                    <p className="text-[9px] sm:text-xs hidden sm:block">in stock</p>
                  </div>

                  {/* Expand Indicator */}
                  <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
                    {expandedProductId === product.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Section - Mobile optimized */}
              {expandedProductId === product.id && (
                <div className="p-3 sm:p-4 bg-background border-t border-border space-y-3 sm:space-y-4">
                  {/* Hide from Shop Toggle */}
                  <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      {product.hidden_from_shop ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-primary" />}
                      <div>
                        <p className="text-xs sm:text-sm font-medium">{product.hidden_from_shop ? "Hidden from Shop" : "Visible in Shop"}</p>
                        <p className="text-[10px] text-muted-foreground">Still available in POS when hidden</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !product.hidden_from_shop;
                        await supabase.from("products").update({ hidden_from_shop: newVal } as any).eq("id", product.id);
                        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, hidden_from_shop: newVal } : p));
                        toast({ title: newVal ? "Product hidden from shop" : "Product visible in shop" });
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${product.hidden_from_shop ? "bg-amber-500" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${product.hidden_from_shop ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Stock Adjustment - Add/Remove Tabs */}
                  <div className="space-y-3 sm:space-y-4">
                    {/* Mode Tabs */}
                    <div className="flex rounded-xl bg-muted/50 p-1 border border-border/50">
                      <button
                        onClick={() => {
                          setStockMode(prev => ({ ...prev, [product.id]: "add" }));
                          setAdjustmentAmount(prev => ({ ...prev, [product.id]: 0 }));
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                          (stockMode[product.id] || "add") === "add"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <PackagePlus className="w-4 h-4" />
                        Add Stock
                      </button>
                      <button
                        onClick={() => {
                          setStockMode(prev => ({ ...prev, [product.id]: "remove" }));
                          setAdjustmentAmount(prev => ({ ...prev, [product.id]: 0 }));
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                          stockMode[product.id] === "remove"
                            ? "bg-destructive text-destructive-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <PackageMinus className="w-4 h-4" />
                        Remove Stock
                      </button>
                    </div>

                    {/* Quantity Input */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1">
                            {(stockMode[product.id] || "add") === "add" ? "Quantity to Add" : "Quantity to Remove"}
                          </label>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = adjustmentAmount[product.id] || 0;
                                setAdjustmentAmount(prev => ({ 
                                  ...prev, 
                                  [product.id]: Math.max(0, current - 1)
                                }));
                              }}
                              disabled={saving === product.id || (adjustmentAmount[product.id] || 0) === 0}
                              className="p-2 sm:p-2.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={stockMode[product.id] === "remove" ? product.stock_quantity : undefined}
                              value={adjustmentAmount[product.id] || 0}
                              onChange={(e) => {
                                let val = parseInt(e.target.value) || 0;
                                if (stockMode[product.id] === "remove") val = Math.min(val, product.stock_quantity);
                                setAdjustmentAmount(prev => ({ ...prev, [product.id]: Math.max(0, val) }));
                              }}
                              placeholder="0"
                              className="w-16 sm:w-20 px-2 sm:px-3 py-2 bg-muted border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = adjustmentAmount[product.id] || 0;
                                const max = stockMode[product.id] === "remove" ? product.stock_quantity : Infinity;
                                setAdjustmentAmount(prev => ({ 
                                  ...prev, 
                                  [product.id]: Math.min(current + 1, max)
                                }));
                              }}
                              disabled={saving === product.id || (stockMode[product.id] === "remove" && (adjustmentAmount[product.id] || 0) >= product.stock_quantity)}
                              className="p-2 sm:p-2.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Result preview */}
                          {(adjustmentAmount[product.id] || 0) > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {product.stock_quantity} → {(stockMode[product.id] || "add") === "add" 
                                ? product.stock_quantity + (adjustmentAmount[product.id] || 0) 
                                : product.stock_quantity - (adjustmentAmount[product.id] || 0)} units
                            </p>
                          )}
                        </div>
                        
                        {/* Color Selection */}
                        {productColors[product.id] && productColors[product.id].length > 0 && (
                          <div>
                            <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Palette className="w-3 h-3" />
                              <span className="hidden sm:inline">Color (stock)</span>
                            </label>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedColorId(prev => ({ ...prev, [product.id]: "" }))}
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                                  !selectedColorId[product.id] 
                                    ? "border-primary ring-2 ring-primary/30" 
                                    : "border-border hover:border-muted-foreground"
                                }`}
                                title="No color"
                              >
                                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                              </button>
                              {productColors[product.id].map(color => (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => setSelectedColorId(prev => ({ ...prev, [product.id]: color.id }))}
                                  className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-all ${
                                    selectedColorId[product.id] === color.id 
                                      ? "border-primary ring-2 ring-primary/30 scale-110" 
                                      : "border-border hover:scale-105"
                                  }`}
                                  style={{ backgroundColor: color.color_hex }}
                                  title={`${color.color_name} (${color.stock_quantity})`}
                                />
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {productColors[product.id].map(color => (
                                <span key={color.id} className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color.color_hex }} />
                                  {color.stock_quantity} • {formatMVR(color.cost_price || 0)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Removal Reason - only shown in remove mode */}
                      {stockMode[product.id] === "remove" && (
                        <div>
                          <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1.5">
                            Reason for Removal <span className="text-destructive">*</span>
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {REMOVAL_REASONS.map(reason => (
                              <button
                                key={reason.value}
                                type="button"
                                onClick={() => setRemovalReason(prev => ({ ...prev, [product.id]: reason.value }))}
                                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs transition-all ${
                                  removalReason[product.id] === reason.value
                                    ? "bg-destructive/10 border-destructive/30 text-foreground font-medium"
                                    : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                                }`}
                              >
                                <span>{reason.icon}</span>
                                <span className="truncate">{reason.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1">Notes (optional)</label>
                        <input
                          type="text"
                          value={adjustmentNotes[product.id] || ""}
                          onChange={(e) => setAdjustmentNotes(prev => ({ 
                            ...prev, 
                            [product.id]: e.target.value 
                          }))}
                          placeholder={stockMode[product.id] === "remove" ? "Additional details..." : "Reason for adjustment"}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>


                    {/* Cost Fields - Only for Add mode */}
                    {(stockMode[product.id] || "add") === "add" && (
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium text-accent">
                          <Receipt className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>Purchase Costs</span>
                          {selectedColorId[product.id] && productColors[product.id]?.find(c => c.id === selectedColorId[product.id]) && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: productColors[product.id]?.find(c => c.id === selectedColorId[product.id])?.color_hex }} />
                              {productColors[product.id]?.find(c => c.id === selectedColorId[product.id])?.color_name}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-2 sm:p-3 bg-muted/30 rounded-lg border border-border">
                          <div>
                            <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1">
                              Unit Price <span className="text-destructive">*</span>
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
                              placeholder="0"
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1">Shipping</label>
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
                              placeholder="0"
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1">Other</label>
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
                              placeholder="0"
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          
                          {/* Total Expense Preview */}
                          {(() => {
                            const costs = stockCosts[product.id];
                            const addQty = adjustmentAmount[product.id] || 0;
                            if (!costs || addQty <= 0) return null;
                            const perUnit = (costs.unitPurchasePrice || 0) + (costs.shippingCost || 0) + (costs.otherExpenses || 0);
                            const totalExpense = perUnit * addQty;
                            if (totalExpense <= 0) return null;
                            return (
                              <div className="col-span-3 p-2 bg-primary/10 rounded-lg">
                                <p className="text-xs sm:text-sm text-foreground">
                                  <span className="font-medium">Total:</span> {formatMVR(totalExpense)}
                                  <span className="text-[10px] sm:text-xs text-muted-foreground ml-1 sm:ml-2">
                                    ({addQty} × {formatMVR(perUnit)} per unit)
                                  </span>
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Update Button */}
                    <button
                      onClick={() => handleSetStock(
                        product.id, 
                        product.stock_quantity, 
                        adjustmentAmount[product.id] || 0,
                        product.name
                      )}
                      disabled={saving === product.id || (adjustmentAmount[product.id] || 0) === 0}
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        stockMode[product.id] === "remove"
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {saving === product.id 
                        ? "Saving..." 
                        : stockMode[product.id] === "remove"
                          ? `Remove ${adjustmentAmount[product.id] || 0} Units`
                          : `Add ${adjustmentAmount[product.id] || 0} Units`
                      }
                    </button>
                  </div>

                  {/* View History Button */}
                  <button
                    onClick={() => {
                      setIsGlobalHistoryView(false);
                      setHistoryDialogProductName(product.name);
                      setHistoryDialogOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted/50 hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors border border-border/50"
                  >
                    <History className="w-4 h-4" />
                    View Stock History
                    {stockHistory.length > 0 && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {stockHistory.length}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Delete Individual History Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteHistoryId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteHistoryId(null);
            setDeleteHistoryProductId(null);
          }
        }}
        onConfirm={handleDeleteHistoryItem}
        title="Delete History Entry"
        description="This will permanently delete this stock history entry. This action cannot be undone."
        variant="destructive"
        confirmText={deletingHistory ? "Deleting..." : "Delete"}
      />

      {/* Stock History Dialog */}
      <StockHistoryDialog
        open={historyDialogOpen}
        onOpenChange={(open) => {
          setHistoryDialogOpen(open);
          if (!open) {
            setIsGlobalHistoryView(false);
          }
        }}
        productName={historyDialogProductName}
        stockHistory={stockHistory}
        loading={historyLoading}
        isSuperAdmin={isSuperAdmin}
        showProductFilter={isGlobalHistoryView}
        onDeleteHistory={(historyId) => {
          setDeleteHistoryId(historyId);
          setDeleteHistoryProductId(expandedProductId);
        }}
      />
    </div>
  );
};

export default StockManagementTab;
