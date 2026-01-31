import { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, Package, ShoppingCart, 
  DollarSign, Users, Plus, X, Trash2, Edit2, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Calendar, PieChart, Wallet, ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR, formatMVRCompact } from "@/lib/currency";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, subDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
type PeriodFilter = "today" | "week" | "month" | "year" | "custom";
interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  order_id: string | null;
  created_at: string;
}

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  onDeliveryOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  // New stats
  totalCustomers: number;
  weeklyRevenue: number;
  weeklyExpenses: number;
  stockValueCost: number;
  stockValueSelling: number;
  totalStockItems: number;
}

const AdminDashboard = () => {
  const { isSuperAdmin, isAdmin, user } = useAuth();
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    onDeliveryOrders: 0,
    deliveredOrders: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    // New stats
    totalCustomers: 0,
    weeklyRevenue: 0,
    weeklyExpenses: 0,
    stockValueCost: 0,
    stockValueSelling: 0,
    totalStockItems: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
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
  
  // Period filter state
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("week");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [periodStats, setPeriodStats] = useState({ income: 0, expenses: 0 });
  const [periodFilterOpen, setPeriodFilterOpen] = useState(false);
  
  // Stock value details dialog state
  const [showStockDetails, setShowStockDetails] = useState(false);
  const [stockDetails, setStockDetails] = useState<Array<{
    id: string;
    name: string;
    stock_quantity: number;
    cost_price: number;
    selling_price: number;
    total_cost: number;
    total_selling: number;
  }>>([]);

  // Check if user is a full admin (admin role) vs staff with permissions
  useEffect(() => {
    const checkFullAdmin = async () => {
      if (!user) return;
      
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      // User is a full admin if they have admin or super_admin role
      const hasAdminRole = roles?.some(r => r.role === "admin" || r.role === "super_admin");
      setIsFullAdmin(hasAdminRole || false);
    };
    
    checkFullAdmin();
  }, [user]);

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions for dashboard updates
    const ordersChannel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          console.log('Orders changed, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          console.log('Transactions changed, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('dashboard-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.log('Products changed, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    const stockChannel = supabase
      .channel('dashboard-stock')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_history' },
        () => {
          console.log('Stock history changed, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(stockChannel);
    };
  }, []);

  // Helper to get period date range
  const getPeriodDateRange = (period: PeriodFilter): { start: Date; end: Date } => {
    const now = new Date();
    const end = now;
    let start: Date;
    
    switch (period) {
      case "today":
        start = startOfDay(now);
        break;
      case "week":
        start = subDays(now, 7);
        break;
      case "month":
        start = startOfMonth(now);
        break;
      case "year":
        start = startOfYear(now);
        break;
      case "custom":
        start = customStartDate ? new Date(customStartDate) : subDays(now, 7);
        return { 
          start, 
          end: customEndDate ? new Date(customEndDate) : now 
        };
      default:
        start = subDays(now, 7);
    }
    
    return { start, end };
  };

  // Fetch period-specific data
  const fetchPeriodData = async () => {
    const { start, end } = getPeriodDateRange(periodFilter);
    
    const { data: periodTxns } = await supabase
      .from("transactions")
      .select("type, amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    
    const txns = periodTxns || [];
    const income = txns.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = txns.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
    
    setPeriodStats({ income, expenses });
  };

  // Fetch period data when filter changes
  useEffect(() => {
    if (periodFilter !== "custom" || (customStartDate && customEndDate)) {
      fetchPeriodData();
    }
  }, [periodFilter, customStartDate, customEndDate]);

  // Period label for display
  const periodLabels: Record<PeriodFilter, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
    custom: "Custom Period"
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const [
      ordersRes,
      productsRes,
      transactionsRes,
      monthlyTransactionsRes,
      weeklyTransactionsRes,
      stockHistoryRes,
      profilesRes
    ] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("products").select("id, stock_quantity, price"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").gte("created_at", startOfMonth),
      supabase.from("transactions").select("*").gte("created_at", startOfWeek),
      supabase.from("stock_history").select("product_id, unit_purchase_price, change_amount, change_type").eq("change_type", "restock"),
      supabase.from("profiles").select("id")
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const allTransactions = transactionsRes.data || [];
    const monthlyTxns = monthlyTransactionsRes.data || [];
    const weeklyTxns = weeklyTransactionsRes.data || [];
    const stockHistory = stockHistoryRes.data || [];
    const profiles = profilesRes.data || [];

    const totalRevenue = allTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalExpenses = allTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyRevenue = monthlyTxns
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyExpenses = monthlyTxns
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const weeklyRevenue = weeklyTxns
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const weeklyExpenses = weeklyTxns
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Count orders by status
    const pendingPaymentOrders = orders.filter(o => o.payment_status === "pending" || o.payment_status === "uploaded").length;
    const confirmedPaymentOrders = orders.filter(o => o.payment_status === "confirmed").length;
    const onDeliveryOrders = orders.filter(o => o.status === "on_delivery" || o.status === "shipped").length;
    const deliveredOrders = orders.filter(o => o.status === "delivered").length;
    
    // Count low stock products (stock <= 5 and stock > 0, or stock = 0)
    const lowStockCount = products.filter(p => p.stock_quantity <= 5).length;

    // Calculate total stock items
    const totalStockItems = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);

    // Calculate stock value at selling price
    const stockValueSelling = products.reduce((sum, p) => sum + ((p.stock_quantity || 0) * Number(p.price || 0)), 0);

    // Calculate stock value at cost price (using latest unit_purchase_price from stock_history)
    const productCostMap = new Map<string, number>();
    stockHistory.forEach(sh => {
      if (sh.unit_purchase_price && !productCostMap.has(sh.product_id)) {
        productCostMap.set(sh.product_id, Number(sh.unit_purchase_price));
      }
    });

    const stockValueCost = products.reduce((sum, p) => {
      const unitCost = productCostMap.get(p.id) || 0;
      return sum + ((p.stock_quantity || 0) * unitCost);
    }, 0);

    // Count unique customers from profiles
    const totalCustomers = profiles.length;

    setStats({
      totalRevenue,
      totalExpenses,
      totalOrders: orders.length,
      pendingOrders: pendingPaymentOrders,
      confirmedOrders: confirmedPaymentOrders,
      onDeliveryOrders,
      deliveredOrders,
      totalProducts: products.length,
      lowStockProducts: lowStockCount,
      monthlyRevenue,
      monthlyExpenses,
      totalCustomers,
      weeklyRevenue,
      weeklyExpenses,
      stockValueCost,
      stockValueSelling,
      totalStockItems,
    });

    setTransactions(allTransactions as Transaction[]);
    setLoading(false);
  };

  // Fetch stock details for dialog
  const fetchStockDetails = async () => {
    const [productsRes, stockHistoryRes] = await Promise.all([
      supabase.from("products").select("id, name, stock_quantity, price"),
      supabase.from("stock_history").select("product_id, unit_purchase_price").eq("change_type", "restock")
    ]);

    const products = productsRes.data || [];
    const stockHistory = stockHistoryRes.data || [];

    // Build cost price map (latest cost per product)
    const productCostMap = new Map<string, number>();
    stockHistory.forEach(sh => {
      if (sh.unit_purchase_price && !productCostMap.has(sh.product_id)) {
        productCostMap.set(sh.product_id, Number(sh.unit_purchase_price));
      }
    });

    const details = products
      .filter(p => p.stock_quantity > 0)
      .map(p => {
        const costPrice = productCostMap.get(p.id) || 0;
        const sellingPrice = Number(p.price) || 0;
        const stockQty = p.stock_quantity || 0;
        return {
          id: p.id,
          name: p.name,
          stock_quantity: stockQty,
          cost_price: costPrice,
          selling_price: sellingPrice,
          total_cost: stockQty * costPrice,
          total_selling: stockQty * sellingPrice,
        };
      })
      .sort((a, b) => b.total_selling - a.total_selling);

    setStockDetails(details);
    setShowStockDetails(true);
  };

  const resetForm = () => {
    setFormData({ type: "expense", category: "", amount: "", description: "" });
    setEditingTransaction(null);
    setShowTransactionForm(false);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description || "",
    });
    setShowTransactionForm(true);
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
      fetchDashboardData();
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
      fetchDashboardData();
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const expenseCategories = ["Inventory", "Shipping", "Marketing", "Utilities", "Rent", "Salaries", "Equipment", "Other"];
  const incomeCategories = ["Product Sales", "Services", "Refund Reversed", "Other"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const netProfit = stats.totalRevenue - stats.totalExpenses;
  const monthlyNetProfit = stats.monthlyRevenue - stats.monthlyExpenses;
  const weeklyNetProfit = stats.weeklyRevenue - stats.weeklyExpenses;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Dashboard Overview</h2>
        <p className="text-xs text-muted-foreground">Monitor your business performance</p>
      </div>

      {/* Primary Stats Row - Financial data only for full admins */}
      {isFullAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            title="Total Revenue"
            value={formatMVR(stats.totalRevenue)}
            icon={TrendingUp}
            trend={`${formatMVR(stats.monthlyRevenue)} this month`}
            trendUp={true}
            variant="success"
          />
          <StatCard
            title="Total Expenses"
            value={formatMVR(stats.totalExpenses)}
            icon={TrendingDown}
            trend={`${formatMVR(stats.monthlyExpenses)} this month`}
            trendUp={false}
            variant="danger"
          />
          <StatCard
            title="Net Profit"
            value={formatMVR(netProfit)}
            icon={Wallet}
            trend={`${formatMVR(monthlyNetProfit)} this month`}
            trendUp={monthlyNetProfit > 0}
            variant={netProfit >= 0 ? "primary" : "danger"}
            className="col-span-2 lg:col-span-1"
          />
        </div>
      )}

      {/* Business Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStatCard
          title="Customers"
          value={stats.totalCustomers.toString()}
          icon={Users}
          subtitle="Registered users"
        />
        <MiniStatCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          icon={ShoppingCart}
          subtitle={`${stats.pendingOrders} pending`}
        />
        <MiniStatCard
          title="On Delivery"
          value={stats.onDeliveryOrders.toString()}
          icon={Package}
          subtitle={`${stats.deliveredOrders} delivered`}
        />
        <MiniStatCard
          title="Confirmed"
          value={stats.confirmedOrders.toString()}
          icon={CheckCircle2}
          subtitle="Paid orders"
        />
        <MiniStatCard
          title="Products"
          value={stats.totalProducts.toString()}
          icon={Package}
          subtitle={`${stats.totalStockItems} in stock`}
        />
        <MiniStatCard
          title="Low Stock"
          value={stats.lowStockProducts.toString()}
          icon={Package}
          subtitle="Need restock"
          highlight={stats.lowStockProducts > 0}
        />
      </div>

      {/* Stock Value & Weekly Summary - Financial data only for full admins */}
      {isFullAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stock Values Card - Clickable */}
          <div 
            className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={fetchStockDetails}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Stock Value</p>
                <p className="text-xs text-muted-foreground">{stats.totalStockItems} items in stock · <span className="text-primary">Click for details</span></p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Cost Price</p>
                <p className="text-lg font-bold text-foreground">{formatMVR(stats.stockValueCost)}</p>
                <p className="text-[10px] text-muted-foreground">Purchase value</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5">
                <p className="text-xs text-muted-foreground mb-1">Selling Price</p>
                <p className="text-lg font-bold text-primary">{formatMVR(stats.stockValueSelling)}</p>
                <p className="text-[10px] text-muted-foreground">Potential revenue</p>
              </div>
            </div>
            
            {stats.stockValueCost > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">
                  Potential Profit: <span className="font-semibold text-primary">{formatMVR(stats.stockValueSelling - stats.stockValueCost)}</span>
                </p>
              </div>
            )}
          </div>

          {/* Period Summary Card with Filter */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{periodLabels[periodFilter]}</p>
                  <p className="text-xs text-muted-foreground">
                    {periodFilter === "custom" && customStartDate && customEndDate 
                      ? `${format(new Date(customStartDate), "MMM d")} - ${format(new Date(customEndDate), "MMM d, yyyy")}`
                      : periodFilter === "today" ? "Today's performance"
                      : periodFilter === "week" ? "Last 7 days"
                      : periodFilter === "month" ? "Current month"
                      : periodFilter === "year" ? "Year to date"
                      : "Select period"}
                  </p>
                </div>
              </div>
              
              <Popover open={periodFilterOpen} onOpenChange={setPeriodFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
                    <span className="text-xs">Filter</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2">
                  <div className="space-y-1">
                    {(["today", "week", "month", "year"] as PeriodFilter[]).map((period) => (
                      <button
                        key={period}
                        onClick={() => {
                          setPeriodFilter(period);
                          setPeriodFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          periodFilter === period 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        }`}
                      >
                        {periodLabels[period]}
                      </button>
                    ))}
                    <div className="border-t border-border my-2" />
                    <button
                      onClick={() => setPeriodFilter("custom")}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        periodFilter === "custom" 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      }`}
                    >
                      Custom Range
                    </button>
                    
                    {periodFilter === "custom" && (
                      <div className="space-y-2 pt-2">
                        <div>
                          <label className="text-xs text-muted-foreground">From</label>
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">To</label>
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full h-8"
                          onClick={() => {
                            fetchPeriodData();
                            setPeriodFilterOpen(false);
                          }}
                          disabled={!customStartDate || !customEndDate}
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Income</p>
                <p className="text-sm font-bold text-[hsl(var(--chart-2))]">{formatMVR(periodStats.income)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                <p className="text-sm font-bold text-destructive">{formatMVR(periodStats.expenses)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/5">
                <p className="text-xs text-muted-foreground mb-1">Net</p>
                <p className={`text-sm font-bold ${periodStats.income - periodStats.expenses >= 0 ? "text-primary" : "text-destructive"}`}>
                  {periodStats.income - periodStats.expenses >= 0 ? "+" : ""}{formatMVR(periodStats.income - periodStats.expenses)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Staff notice */}
      {!isFullAdmin && (
        <div className="bg-muted/30 border border-border rounded-2xl p-4">
          <p className="text-sm text-muted-foreground text-center">
            Financial details are only visible to administrators
          </p>
        </div>
      )}

      {/* Transactions Section - Only for full admins */}
      {isFullAdmin && (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Transactions</h3>
            <p className="text-xs text-muted-foreground">Recent financial activity</p>
          </div>
          <button
            onClick={() => setShowTransactionForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {showTransactionForm && (
          <div className="p-4 bg-muted/30 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-foreground">
                {editingTransaction ? "Edit Transaction" : "New Transaction"}
              </h4>
              <button 
                onClick={resetForm}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "income" })}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${
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
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${
                    formData.type === "expense"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Expense
                </button>
              </div>

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />

              <input
                type="text"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {saving ? "Saving..." : editingTransaction ? "Update Transaction" : "Add Transaction"}
              </button>
            </form>
          </div>
        )}

        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {transactions.slice(0, 20).map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"
              }`}>
                {tx.type === "income" ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-500" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{tx.category}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {tx.description || new Date(tx.created_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm ${tx.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatMVR(tx.amount)}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(tx)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(tx.id)}
                    className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {transactions.length === 0 && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first transaction to get started</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Stock Value Details Dialog */}
      <Dialog open={showStockDetails} onOpenChange={setShowStockDetails}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Stock Value Breakdown
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Cost Value</p>
              <p className="text-lg font-bold text-foreground">
                {formatMVR(stockDetails.reduce((sum, p) => sum + p.total_cost, 0))}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Selling Value</p>
              <p className="text-lg font-bold text-primary">
                {formatMVR(stockDetails.reduce((sum, p) => sum + p.total_selling, 0))}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Potential Profit</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatMVR(stockDetails.reduce((sum, p) => sum + (p.total_selling - p.total_cost), 0))}
              </p>
            </div>
          </div>

          <ScrollArea className="h-[400px] rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="text-center font-semibold">Stock</TableHead>
                  <TableHead className="text-right font-semibold">Unit Cost</TableHead>
                  <TableHead className="text-right font-semibold">Unit Price</TableHead>
                  <TableHead className="text-right font-semibold">Total Cost</TableHead>
                  <TableHead className="text-right font-semibold">Total Value</TableHead>
                  <TableHead className="text-right font-semibold">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No products in stock
                    </TableCell>
                  </TableRow>
                ) : (
                  stockDetails.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium max-w-[200px] truncate" title={product.name}>
                        {product.name}
                      </TableCell>
                      <TableCell className="text-center">{product.stock_quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.cost_price > 0 ? formatMVR(product.cost_price) : "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatMVR(product.selling_price)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.total_cost > 0 ? formatMVR(product.total_cost) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatMVR(product.total_selling)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {product.total_cost > 0 ? formatMVR(product.total_selling - product.total_cost) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            Showing {stockDetails.length} products with stock
          </p>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Transaction?"
        description="This transaction record will be permanently deleted."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

// Primary Stat Card
const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  variant,
  className = "",
}: {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp?: boolean;
  variant: "success" | "danger" | "primary";
  className?: string;
}) => {
  const variantStyles = {
    success: "bg-emerald-500/10 text-emerald-600",
    danger: "bg-rose-500/10 text-rose-500",
    primary: "bg-primary/10 text-primary",
  };

  return (
    <div className={`bg-card border border-border rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${variantStyles[variant]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trendUp !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs ${trendUp ? "text-emerald-600" : "text-rose-500"}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{trend}</p>
    </div>
  );
};

// Mini Stat Card
const MiniStatCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: string;
  icon: any;
  subtitle: string;
  highlight?: boolean;
}) => {
  return (
    <div className={`bg-card border rounded-xl p-3 text-center ${highlight ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
      <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${highlight ? "bg-destructive/10" : "bg-muted"}`}>
        <Icon className={`w-4 h-4 ${highlight ? "text-destructive" : "text-muted-foreground"}`} />
      </div>
      <p className={`text-lg font-bold ${highlight ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{title}</p>
      <p className="text-[9px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
    </div>
  );
};

export default AdminDashboard;
