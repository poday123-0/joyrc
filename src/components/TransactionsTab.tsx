import { useState, useEffect, useMemo } from "react";
import { 
  Plus, X, Trash2, Edit2, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Calendar, Download, Package, Truck, User, ChevronDown, ChevronUp, Settings2,
  Hash, CreditCard, Phone, MapPin, UserCheck, ShoppingBag, Boxes, CalendarDays
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import TransactionDetailSheet from "@/components/TransactionDetailSheet";
import TransactionCategoriesTab from "@/components/TransactionCategoriesTab";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

type DatePeriod = "all" | "today" | "week" | "month" | "year" | "custom";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  order_id: string | null;
  created_at: string;
  product_name: string | null;
  unit_purchase_price: number | null;
  shipping_cost: number | null;
  other_costs: number | null;
  quantity: number | null;
  added_by: string | null;
  profile?: { full_name: string | null } | null;
  // Customer info from orders
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  // Product info for sales
  item_code?: string | null;
  sold_by_name?: string | null;
  payment_method?: string | null;
  order_status?: string | null;
}

interface TransactionCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  is_active: boolean;
}

const TransactionsTab = () => {
  const { isSuperAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    amount: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailSheetType, setDetailSheetType] = useState<"income" | "expense">("income");
  const [showInventoryOnly, setShowInventoryOnly] = useState(false);
  
  // Inventory filters
  const [inventoryDatePeriod, setInventoryDatePeriod] = useState<DatePeriod>("all");
  const [inventoryCustomDateRange, setInventoryCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [inventoryProductFilter, setInventoryProductFilter] = useState<string>("all");
  
  // Main transactions filters
  const [txDatePeriod, setTxDatePeriod] = useState<DatePeriod>("all");
  const [txCustomDateRange, setTxCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchTransactions();
    fetchCategories();

    // Realtime subscription for instant updates
    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("transaction_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setCategories(data as TransactionCategory[]);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const txList = data || [];

    // Batch fetch all needed profiles at once
    const addedByIds = [...new Set(txList.filter(tx => tx.added_by).map(tx => tx.added_by!))];
    const orderIds = [...new Set(txList.filter(tx => tx.order_id).map(tx => tx.order_id!))];

    // Parallel batch queries
    const [profilesRes, ordersRes] = await Promise.all([
      addedByIds.length > 0
        ? supabase.from("profiles").select("user_id, full_name").in("user_id", addedByIds)
        : { data: [] as any[] },
      orderIds.length > 0
        ? supabase.from("orders").select("id, order_number, user_id, phone, shipping_address, payment_method, status, assigned_to").in("id", orderIds)
        : { data: [] as any[] },
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p.full_name]));
    const orderMap = new Map((ordersRes.data || []).map((o: any) => [o.id, o]));

    // Get customer & sold-by profiles from orders
    const orderUserIds = [...new Set((ordersRes.data || []).flatMap((o: any) => [o.user_id, o.assigned_to].filter(Boolean)))];
    const missingProfileIds = orderUserIds.filter(id => !profileMap.has(id));
    
    if (missingProfileIds.length > 0) {
      const { data: extraProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", missingProfileIds);
      (extraProfiles || []).forEach((p: any) => profileMap.set(p.user_id, p.full_name));
    }

    // Batch fetch item codes for order-linked transactions
    let itemCodeMap = new Map<string, string>();
    if (orderIds.length > 0) {
      const { data: orderItemsData } = await supabase
        .from("order_items")
        .select("order_id, product_id")
        .in("order_id", orderIds);
      
      if (orderItemsData && orderItemsData.length > 0) {
        const productIds = [...new Set(orderItemsData.map(oi => oi.product_id))];
        const { data: productsData } = await supabase
          .from("products")
          .select("id, item_code")
          .in("id", productIds);
        
        const prodCodeMap = new Map((productsData || []).map(p => [p.id, p.item_code]));
        // Map order_id -> first item's item_code
        const orderItemCodeMap = new Map<string, string>();
        orderItemsData.forEach(oi => {
          if (!orderItemCodeMap.has(oi.order_id)) {
            const code = prodCodeMap.get(oi.product_id);
            if (code) orderItemCodeMap.set(oi.order_id, code);
          }
        });
        itemCodeMap = orderItemCodeMap;
      }
    }

    const transactionsWithDetails = txList.map(tx => {
      const order = tx.order_id ? orderMap.get(tx.order_id) : null;
      const soldById = order?.assigned_to || tx.added_by;

      return {
        ...tx,
        profile: tx.added_by ? { full_name: profileMap.get(tx.added_by) || null } : null,
        order_number: order?.order_number || null,
        customer_name: order ? (profileMap.get(order.user_id) || null) : null,
        customer_phone: order?.phone || null,
        customer_address: order?.shipping_address || null,
        item_code: tx.order_id ? (itemCodeMap.get(tx.order_id) || null) : null,
        sold_by_name: soldById ? (profileMap.get(soldById) || null) : null,
        payment_method: order?.payment_method || null,
        order_status: order?.status || null,
      };
    });

    setTransactions(transactionsWithDetails as Transaction[]);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ type: "expense", category: "", amount: "", description: "" });
    setEditingTransaction(null);
    setShowForm(false);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const txData = {
        type: formData.type,
        category: formData.category.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || null,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from("transactions")
          .update(txData)
          .eq("id", editingTransaction.id);
        if (error) throw error;
        toast({
          title: "Transaction Updated",
          description: "The transaction has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert(txData);
        if (error) throw error;
        toast({
          title: "Transaction Added",
          description: `${formData.type === "income" ? "Income" : "Expense"} of ${formatMVR(parseFloat(formData.amount))} recorded.`,
        });
      }

      resetForm();
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionToDelete);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Transaction Deleted",
        description: "The transaction has been removed.",
      });
      fetchTransactions();
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  // Get categories for the selected type
  const expenseCategories = categories.filter(c => c.type === "expense").map(c => c.name);
  const incomeCategories = categories.filter(c => c.type === "income").map(c => c.name);

  // Helper to check if a transaction is inventory-related
  const isInventoryTransaction = (tx: Transaction) => {
    return tx.type === "expense" && (
      tx.category.toLowerCase().includes("inventory") || 
      tx.category.toLowerCase().includes("stock") ||
      tx.category.toLowerCase().includes("product") ||
      tx.product_name // Has product_name = stock purchase
    );
  };

  // Get unique product names for inventory filter
  const inventoryProductNames = useMemo(() => {
    const products = transactions
      .filter(tx => isInventoryTransaction(tx) && tx.product_name)
      .map(tx => tx.product_name!)
      .filter((name, index, self) => self.indexOf(name) === index)
      .sort();
    return products;
  }, [transactions]);

  // Helper to check if date is within the selected period
  const isWithinDatePeriod = (dateStr: string, period: DatePeriod, customRange?: { from: Date | undefined; to: Date | undefined }) => {
    if (period === "all") return true;
    
    const date = new Date(dateStr);
    const now = new Date();
    
    switch (period) {
      case "today":
        return startOfDay(date).getTime() === startOfDay(now).getTime();
      case "week":
        return date >= startOfWeek(now, { weekStartsOn: 1 }) && date <= endOfDay(now);
      case "month":
        return date >= startOfMonth(now) && date <= endOfDay(now);
      case "year":
        return date >= startOfYear(now) && date <= endOfDay(now);
      case "custom":
        if (customRange?.from && customRange?.to) {
          return isWithinInterval(date, { start: startOfDay(customRange.from), end: endOfDay(customRange.to) });
        }
        if (customRange?.from) {
          return date >= startOfDay(customRange.from);
        }
        return true;
      default:
        return true;
    }
  };

  // Get unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const cats = transactions
      .filter(tx => !isInventoryTransaction(tx))
      .map(tx => tx.category)
      .filter((cat, index, self) => self.indexOf(cat) === index)
      .sort();
    return cats;
  }, [transactions]);

  // Filter and search transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (tx.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = filterType === "all" || tx.type === filterType;
    
    // If showing inventory only, filter to inventory transactions with additional filters
    if (showInventoryOnly) {
      const isInventory = isInventoryTransaction(tx);
      const matchesDatePeriod = isWithinDatePeriod(tx.created_at, inventoryDatePeriod, inventoryCustomDateRange);
      const matchesProduct = inventoryProductFilter === "all" || tx.product_name === inventoryProductFilter;
      return matchesSearch && isInventory && matchesDatePeriod && matchesProduct;
    }
    
    // Apply date period filter for main transactions
    const matchesDatePeriod = isWithinDatePeriod(tx.created_at, txDatePeriod, txCustomDateRange);
    const matchesCategory = txCategoryFilter === "all" || tx.category === txCategoryFilter;
    
    // Otherwise exclude inventory transactions from the main list
    return matchesSearch && matchesType && matchesDatePeriod && matchesCategory && !isInventoryTransaction(tx);
  });

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(tx => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = filteredTransactions
    .filter(tx => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  // Separate inventory/stock purchases from other expenses (always use full data for summary card)
  const allInventoryTransactions = transactions.filter(tx => isInventoryTransaction(tx));
  const inventoryExpenses = allInventoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  // Calculate filtered inventory total when filters are active
  const filteredInventoryExpenses = showInventoryOnly ? filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0) : inventoryExpenses;
  
  const otherExpenses = transactions
    .filter(tx => tx.type === "expense" && !isInventoryTransaction(tx))
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          className={`p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15 transition-colors ${filterType === "income" && !showInventoryOnly ? "ring-2 ring-emerald-500" : ""}`}
          onClick={() => {
            setShowInventoryOnly(false);
            setFilterType(filterType === "income" ? "all" : "income");
          }}
        >
          <p className="text-xs text-muted-foreground mb-1">Total Income</p>
          <p className="text-lg font-bold text-emerald-600">{formatMVR(totalIncome)}</p>
          {filterType === "income" && !showInventoryOnly && (
            <p className="text-[10px] text-emerald-600 mt-0.5">Click to show all</p>
          )}
        </div>
        <div 
          className={`p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 cursor-pointer hover:bg-rose-500/15 transition-colors ${filterType === "expense" && !showInventoryOnly ? "ring-2 ring-rose-500" : ""}`}
          onClick={() => {
            setShowInventoryOnly(false);
            setFilterType(filterType === "expense" ? "all" : "expense");
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Other Expenses</p>
          </div>
          <p className="text-lg font-bold text-rose-500">{formatMVR(otherExpenses)}</p>
          {filterType === "expense" && !showInventoryOnly && (
            <p className="text-[10px] text-rose-500 mt-0.5">Click to show all</p>
          )}
        </div>
        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
          <p className={`text-lg font-bold ${totalIncome - otherExpenses >= 0 ? "text-primary" : "text-rose-500"}`}>
            {formatMVR(totalIncome - otherExpenses)}
          </p>
        </div>
        <div 
          className={`p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors ${showInventoryOnly ? "ring-2 ring-amber-500" : ""}`}
          onClick={() => {
            setShowInventoryOnly(!showInventoryOnly);
            setFilterType("all");
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Boxes className="w-3 h-3 text-amber-600" />
            <p className="text-xs text-muted-foreground">Product Purchase</p>
          </div>
          <p className="text-lg font-bold text-amber-600">{formatMVR(inventoryExpenses)}</p>
          {showInventoryOnly && (inventoryDatePeriod !== "all" || inventoryProductFilter !== "all") && (
            <p className="text-[10px] text-amber-600/70 mt-1">
              Filtered: {formatMVR(filteredInventoryExpenses)}
            </p>
          )}
          {showInventoryOnly && (
            <p className="text-[10px] text-amber-600 mt-0.5">Click to show all</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
        
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors text-sm"
            >
              <Settings2 className="w-4 h-4" /> Categories
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Manage Categories</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <TransactionCategoriesTab onCategoryChange={fetchCategories} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search and Filters */}
      {!showInventoryOnly && (
        <DataFilterBar
          searchPlaceholder="Search transactions..."
          statusOptions={[
            { value: "all", label: "All Types" },
            { value: "income", label: "Income", color: "bg-emerald-500/20 text-emerald-500" },
            { value: "expense", label: "Expenses", color: "bg-coral/20 text-coral" },
            ...(uniqueCategories.length > 0 ? [
              { value: "__divider__", label: "──────" },
              ...uniqueCategories.map(cat => ({ value: `cat:${cat}`, label: cat })),
            ] : []),
          ]}
          statusLabel="Type & Category"
          onFiltersChange={(filters) => {
            setSearchQuery(filters.search);
            setTxDatePeriod(filters.period as DatePeriod);
            setTxCustomDateRange(filters.customDateRange);
            
            // Parse combined type+category filter
            const statusVal = filters.status;
            if (statusVal === "all") {
              setFilterType("all");
              setTxCategoryFilter("all");
            } else if (statusVal === "income" || statusVal === "expense") {
              setFilterType(statusVal);
              setTxCategoryFilter("all");
            } else if (statusVal.startsWith("cat:")) {
              setFilterType("all");
              setTxCategoryFilter(statusVal.replace("cat:", ""));
            }
          }}
        />
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground">
              {editingTransaction ? "Edit Transaction" : "New Transaction"}
            </h4>
            <button 
              onClick={resetForm}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "income" })}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  formData.type === "income"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Income
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "expense" })}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  formData.type === "expense"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <ArrowDownRight className="w-4 h-4" /> Expense
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Select Category</option>
                {(formData.type === "income" ? incomeCategories : expenseCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <input
                type="number"
                step="0.01"
                placeholder="Amount (MVR)"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {saving ? "Saving..." : editingTransaction ? "Update Transaction" : "Add Transaction"}
            </button>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">
              {showInventoryOnly ? "Product Purchase" : "Transactions"} • {filteredTransactions.length} item{filteredTransactions.length !== 1 ? "s" : ""}
              {showInventoryOnly && inventoryDatePeriod !== "all" && (
                <span className="ml-2 text-xs text-amber-600">
                  ({inventoryDatePeriod === "custom" && inventoryCustomDateRange.from 
                    ? `${format(inventoryCustomDateRange.from, "MMM d")}${inventoryCustomDateRange.to ? ` - ${format(inventoryCustomDateRange.to, "MMM d")}` : ""}`
                    : inventoryDatePeriod})
                </span>
              )}
            </p>
            {showInventoryOnly && (
              <button
                onClick={() => {
                  setShowInventoryOnly(false);
                  setInventoryDatePeriod("all");
                  setInventoryProductFilter("all");
                  setInventoryCustomDateRange({ from: undefined, to: undefined });
                }}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                Show All Transactions
              </button>
            )}
          </div>
          
          {/* Inventory Filters */}
          {showInventoryOnly && (
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Date Period Pills */}
              <div className="flex flex-wrap gap-1">
                {(["all", "today", "week", "month", "year"] as DatePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setInventoryDatePeriod(period);
                      if (period !== "custom") {
                        setInventoryCustomDateRange({ from: undefined, to: undefined });
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize",
                      inventoryDatePeriod === period
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {period === "all" ? "All Time" : period}
                  </button>
                ))}
                
                {/* Custom Date Range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1",
                        inventoryDatePeriod === "custom"
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <CalendarDays className="w-3 h-3" />
                      Custom
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: inventoryCustomDateRange.from, to: inventoryCustomDateRange.to }}
                      onSelect={(range) => {
                        setInventoryCustomDateRange({ from: range?.from, to: range?.to });
                        if (range?.from) {
                          setInventoryDatePeriod("custom");
                        }
                      }}
                      numberOfMonths={2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Product Filter */}
              {inventoryProductNames.length > 0 && (
                <select
                  value={inventoryProductFilter}
                  onChange={(e) => setInventoryProductFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-foreground border-0 focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="all">All Products</option>
                  {inventoryProductNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
              
              {/* Filtered Total */}
              {(inventoryDatePeriod !== "all" || inventoryProductFilter !== "all") && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filtered Total:</span>
                  <span className="text-sm font-semibold text-amber-600">{formatMVR(filteredInventoryExpenses)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
          {filteredTransactions.map((tx) => {
            const hasStockDetails = tx.product_name || tx.unit_purchase_price || tx.shipping_cost || tx.other_costs || (tx.type === "income" && tx.order_id);
            const isExpanded = expandedId === tx.id;
            
            return (
              <div key={tx.id} className="hover:bg-muted/30 transition-colors">
                <div 
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 ${hasStockDetails ? "cursor-pointer" : ""}`}
                  onClick={() => hasStockDetails && setExpandedId(isExpanded ? null : tx.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"
                    }`}>
                      {tx.type === "income" ? (
                        <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <p className="font-medium text-foreground">{tx.category}</p>
                        {tx.product_name && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full break-words">
                            {tx.product_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 sm:truncate">
                        {tx.description || "No description"} • {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatMVR(tx.amount)}
                    </p>
                    {hasStockDetails && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(tx); }}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(tx.id); }}
                          className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Expanded Stock Details */}
                {isExpanded && hasStockDetails && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-[52px] p-3 bg-muted/50 rounded-xl space-y-2">
                      {tx.product_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Product:</span>
                          <span className="font-medium text-foreground">{tx.product_name}</span>
                          {tx.quantity && (
                            <span className="text-muted-foreground">× {tx.quantity} units</span>
                          )}
                        </div>
                      )}
                      {tx.item_code && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Item Code:</span>
                          <span className="font-medium text-foreground font-mono">{tx.item_code}</span>
                        </div>
                      )}
                      {tx.unit_purchase_price !== null && tx.unit_purchase_price > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-4 h-4 text-center text-muted-foreground">💰</span>
                          <span className="text-muted-foreground">Cost Price:</span>
                          <span className="font-medium text-foreground">{formatMVR(tx.unit_purchase_price)}/unit</span>
                        </div>
                      )}
                      {tx.shipping_cost !== null && tx.shipping_cost > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Shipping:</span>
                          <span className="font-medium text-foreground">{formatMVR(tx.shipping_cost)}</span>
                        </div>
                      )}
                      {tx.other_costs !== null && tx.other_costs > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-4 h-4 text-center text-muted-foreground">📦</span>
                          <span className="text-muted-foreground">Other Costs:</span>
                          <span className="font-medium text-foreground">{formatMVR(tx.other_costs)}</span>
                        </div>
                      )}
                      
                      {/* Income-specific details (sales) */}
                      {tx.type === "income" && (
                        <>
                          {tx.sold_by_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <UserCheck className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Sold by:</span>
                              <span className="font-medium text-foreground">{tx.sold_by_name}</span>
                            </div>
                          )}
                          {tx.customer_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Customer:</span>
                              <span className="font-medium text-foreground">{tx.customer_name}</span>
                            </div>
                          )}
                          {tx.customer_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="font-medium text-foreground">{tx.customer_phone}</span>
                            </div>
                          )}
                          {tx.customer_address && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Address:</span>
                              <span className="font-medium text-foreground truncate max-w-[200px]">{tx.customer_address}</span>
                            </div>
                          )}
                          {tx.payment_method && (
                            <div className="flex items-center gap-2 text-sm">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Payment:</span>
                              <span className="font-medium text-foreground capitalize">{tx.payment_method.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                          {tx.order_status && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-4 h-4 text-center text-muted-foreground">📋</span>
                              <span className="text-muted-foreground">Status:</span>
                              <span className={`font-medium capitalize ${
                                tx.order_status === 'delivered' ? 'text-emerald-600' :
                                tx.order_status === 'cancelled' ? 'text-rose-500' :
                                'text-foreground'
                              }`}>{tx.order_status}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Expense-specific: Added by */}
                      {tx.type === "expense" && tx.profile?.full_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Added by:</span>
                          <span className="font-medium text-foreground">{tx.profile.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <ArrowDownRight className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No transactions found</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Add your first transaction
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
      />

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        type={detailSheetType}
        transactions={transactions}
      />
    </div>
  );
};

export default TransactionsTab;
