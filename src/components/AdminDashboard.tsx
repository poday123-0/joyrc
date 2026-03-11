import { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, Package, ShoppingCart, 
  DollarSign, Users, Plus, X, Trash2, Edit2, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Calendar, PieChart, Wallet, ChevronDown, Search
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
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

// Maldivian Rufiyaa (MVR) icon component
const RufiyaaIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontWeight: 700, fontSize: '0.85em', lineHeight: 1 }}>
    ރ
  </span>
);
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
  // Inventory cash out stats
  totalInventoryCashOut: number;
  monthlyInventoryCashOut: number;
  // COGS - cost of goods sold
  totalCOGS: number;
  monthlyCOGS: number;
}

interface AdminDashboardProps {
  onTabChange?: (tab: string) => void;
  userPermissions?: string[];
  isFullAdmin?: boolean;
}

const AdminDashboard = ({ onTabChange, userPermissions = [], isFullAdmin = false }: AdminDashboardProps) => {
  const { isSuperAdmin, isAdmin, user } = useAuth();
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
    // Inventory cash out stats
    totalInventoryCashOut: 0,
    monthlyInventoryCashOut: 0,
    totalCOGS: 0,
    monthlyCOGS: 0,
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
  const [periodStats, setPeriodStats] = useState({ income: 0, expenses: 0, cashOut: 0 });
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
    category_id: string | null;
    category_name: string;
  }>>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("all");
  const [stockCategories, setStockCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [dailyProfitData, setDailyProfitData] = useState<Array<{ day: string; gross: number; net: number }>>([]);
  const [stockValueTrend, setStockValueTrend] = useState<Array<{ day: string; cost: number; selling: number }>>([]);

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
    
    // Fetch transactions and stock history for the period in parallel
    const [txnsRes, stockRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("type, amount, category")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString()),
      supabase
        .from("stock_history")
        .select("total_expense")
        .eq("change_type", "restock")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
    ]);
    
    const txns = txnsRes.data || [];
    const stockHistory = stockRes.data || [];
    
    const income = txns.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    // Exclude "Inventory" category from expenses (tracked separately in stock management)
    const expenses = txns.filter(t => t.type === "expense" && t.category !== "Inventory").reduce((sum, t) => sum + Number(t.amount), 0);
    // Calculate cash out from inventory purchases
    const cashOut = stockHistory.reduce((sum, sh) => sum + Number(sh.total_expense || 0), 0);
    
    setPeriodStats({ income, expenses, cashOut });
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
      stockHistoryAllRes,
      monthlyStockHistoryRes,
      profilesRes,
      orderItemsRes,
      saleHistoryRes,
    ] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("products").select("id, stock_quantity, price, cost_price"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").gte("created_at", startOfMonth),
      supabase.from("transactions").select("*").gte("created_at", startOfWeek),
      supabase.from("stock_history").select("product_id, unit_purchase_price, change_amount, change_type").eq("change_type", "restock"),
      supabase.from("stock_history").select("total_expense, shipping_cost, other_expenses, unit_purchase_price, change_amount, change_type, created_at").eq("change_type", "restock"),
      supabase.from("stock_history").select("total_expense, shipping_cost, other_expenses, unit_purchase_price, change_amount, change_type, created_at").eq("change_type", "restock").gte("created_at", startOfMonth),
      supabase.from("profiles").select("id"),
      supabase.from("order_items").select("product_id, quantity, created_at"),
      supabase.from("stock_history").select("product_id, unit_purchase_price, change_amount, created_at").eq("change_type", "sale"),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const allTransactions = transactionsRes.data || [];
    const monthlyTxns = monthlyTransactionsRes.data || [];
    const weeklyTxns = weeklyTransactionsRes.data || [];
    const stockHistory = stockHistoryRes.data || [];
    const stockHistoryAll = stockHistoryAllRes.data || [];
    const monthlyStockHistory = monthlyStockHistoryRes.data || [];
    const profiles = profilesRes.data || [];
    const orderItems = orderItemsRes.data || [];
    const saleHistory = saleHistoryRes.data || [];

    // Calculate inventory cash out (total_expense from stock_history restocks)
    const totalInventoryCashOut = stockHistoryAll.reduce((sum, sh) => sum + Number(sh.total_expense || 0), 0);
    const monthlyInventoryCashOut = monthlyStockHistory.reduce((sum, sh) => sum + Number(sh.total_expense || 0), 0);

    const totalRevenue = allTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Exclude inventory-related expenses from regular expenses
    const totalExpenses = allTransactions
      .filter(t => t.type === "expense" && t.category !== "Inventory" && t.category !== "Stock Purchase" && t.category !== "Shipping")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyRevenue = monthlyTxns
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Exclude inventory-related expenses from monthly expenses
    const monthlyExpenses = monthlyTxns
      .filter(t => t.type === "expense" && t.category !== "Inventory" && t.category !== "Stock Purchase" && t.category !== "Shipping")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const weeklyRevenue = weeklyTxns
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const weeklyExpenses = weeklyTxns
      .filter(t => t.type === "expense" && t.category !== "Inventory" && t.category !== "Stock Purchase" && t.category !== "Shipping")
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

    // Calculate COGS from stock_history sale records (unit_purchase_price × quantity sold)
    // For sales with stored cost, use that. For older sales without cost, fallback to restock cost map.
    const totalCOGS = saleHistory.reduce((sum, sh) => {
      const qty = Math.abs(sh.change_amount || 0);
      const costPrice = sh.unit_purchase_price ? Number(sh.unit_purchase_price) : (productCostMap.get(sh.product_id) || 0);
      return sum + (qty * costPrice);
    }, 0);
    
    const monthlyCOGS = saleHistory
      .filter(sh => sh.created_at >= startOfMonth)
      .reduce((sum, sh) => {
        const qty = Math.abs(sh.change_amount || 0);
        const costPrice = sh.unit_purchase_price ? Number(sh.unit_purchase_price) : (productCostMap.get(sh.product_id) || 0);
        return sum + (qty * costPrice);
      }, 0);

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
      totalInventoryCashOut,
      monthlyInventoryCashOut,
      totalCOGS,
      monthlyCOGS,
    });

    setTransactions(allTransactions as Transaction[]);

    // Compute daily profit data for sparklines (current month, per day)
    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const dailyData: Array<{ day: string; gross: number; net: number }> = [];
    
    for (let d = new Date(monthStartDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dayStr = format(d, "yyyy-MM-dd");
      
      const dayRevenue = allTransactions
        .filter(t => t.type === "income" && t.created_at?.startsWith(dayStr))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const dayCOGS = saleHistory
        .filter(sh => sh.created_at?.startsWith(dayStr))
        .reduce((sum, sh) => {
          const qty = Math.abs(sh.change_amount || 0);
          const cp = sh.unit_purchase_price ? Number(sh.unit_purchase_price) : (productCostMap.get(sh.product_id) || 0);
          return sum + (qty * cp);
        }, 0);
      
      const dayExp = allTransactions
        .filter(t => t.type === "expense" && t.category !== "Inventory" && t.category !== "Stock Purchase" && t.category !== "Shipping" && t.created_at?.startsWith(dayStr))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      dailyData.push({ day: format(d, "d"), gross: dayRevenue - dayCOGS, net: dayRevenue - dayCOGS - dayExp });
    }
    setDailyProfitData(dailyData);

    // Compute cumulative stock value trend for current month
    // We track running cost/selling totals by replaying stock changes day by day
    // Start with current values and work backwards isn't ideal, so we use a simpler approach:
    // Show the restock investment (cost) and potential selling value accumulated per day
    const stockTrend: Array<{ day: string; cost: number; selling: number }> = [];
    let runningCost = 0;
    let runningSelling = 0;
    
    for (let d = new Date(monthStartDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dayStr = format(d, "yyyy-MM-dd");
      
      // Restocks on this day add to cost
      const dayRestockCost = stockHistoryAll
        .filter(sh => sh.created_at?.startsWith(dayStr))
        .reduce((sum, sh) => sum + Number(sh.total_expense || 0), 0);
      
      // Revenue (sales) on this day
      const daySalesRevenue = allTransactions
        .filter(t => t.type === "income" && t.created_at?.startsWith(dayStr))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      runningCost += dayRestockCost;
      runningSelling += daySalesRevenue;
      
      stockTrend.push({ day: format(d, "d"), cost: runningCost, selling: runningSelling });
    }
    setStockValueTrend(stockTrend);

    setLoading(false);
  };

  // Fetch stock details for dialog
  const fetchStockDetails = async () => {
    const [productsRes, stockHistoryRes, categoriesRes] = await Promise.all([
      supabase.from("products").select("id, name, stock_quantity, price, category_id"),
      supabase.from("stock_history").select("product_id, unit_purchase_price").eq("change_type", "restock"),
      supabase.from("categories").select("id, name").order("name")
    ]);

    const products = productsRes.data || [];
    const stockHistory = stockHistoryRes.data || [];
    const categories = categoriesRes.data || [];

    // Build category map
    const categoryMap = new Map<string, string>();
    categories.forEach(c => categoryMap.set(c.id, c.name));

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
          category_id: p.category_id,
          category_name: p.category_id ? categoryMap.get(p.category_id) || "Uncategorized" : "Uncategorized",
        };
      })
      .sort((a, b) => b.total_selling - a.total_selling);

    setStockDetails(details);
    setStockCategories(categories);
    setStockSearchQuery("");
    setStockCategoryFilter("all");
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

    const grossProfit = stats.totalRevenue - stats.totalCOGS;
    const monthlyGrossProfit = stats.monthlyRevenue - stats.monthlyCOGS;
    const netProfit = grossProfit - stats.totalExpenses;
    const monthlyNetProfit = monthlyGrossProfit - stats.monthlyExpenses;

  // Tab permission definitions for staff quick access cards - matches PERMISSION_AREAS in StaffManagementTab
  const availableTabs = [
    // Products & Inventory
    { id: "products", label: "Products", icon: Package, description: "Add, edit and manage products" },
    { id: "categories", label: "Categories", icon: Package, description: "Manage product categories" },
    { id: "stock", label: "Stock Management", icon: Package, description: "View and update inventory" },
    { id: "featured", label: "Featured Products", icon: Package, description: "Manage featured highlights" },
    
    // Orders & Sales
    { id: "pos", label: "Quick POS", icon: DollarSign, description: "Process walk-in sales" },
    { id: "orders", label: "Orders", icon: ShoppingCart, description: "Manage customer orders" },
    { id: "preorders", label: "Pre-orders", icon: ShoppingCart, description: "Manage pre-order requests" },
    { id: "deliveries", label: "Deliveries", icon: Package, description: "Manage delivery assignments" },
    
    // Content & Media
    { id: "hero", label: "Hero Banners", icon: Package, description: "Manage hero backgrounds" },
    { id: "videos", label: "Videos", icon: Package, description: "Manage video showcases" },
    { id: "home-content", label: "Home Content", icon: Package, description: "Edit homepage features" },
    { id: "support", label: "Support Content", icon: Package, description: "Manage FAQ and articles" },
    { id: "footer", label: "Footer Settings", icon: Package, description: "Configure footer info" },
    { id: "storage", label: "Storage", icon: Package, description: "Manage uploaded files" },
    
    // Communication
    { id: "messages", label: "Messages", icon: Users, description: "View contact messages" },
    { id: "email-templates", label: "Email Templates", icon: Users, description: "Manage templates" },
    { id: "marketing", label: "Marketing Emails", icon: Users, description: "Send campaigns" },
    
    // Financial
    { id: "transactions", label: "Transactions", icon: Wallet, description: "View financial records" },
    { id: "reports", label: "Reports", icon: Wallet, description: "View sales analytics" },
    { id: "bank", label: "Bank Settings", icon: Wallet, description: "Manage bank details" },
    
    // User Management
    { id: "users", label: "Users", icon: Users, description: "View customer accounts" },
  ];

  // Get tabs that staff has permission for
  const staffPermittedTabs = availableTabs.filter(tab => 
    userPermissions.includes(`tab_${tab.id}`)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Dashboard Overview</h2>
        <p className="text-xs text-muted-foreground">
          {isFullAdmin ? "Monitor your business performance" : "Quick access to your permitted areas"}
        </p>
      </div>

      {/* Staff Quick Access Cards - shown instead of stats for non-full admins */}
      {!isFullAdmin && staffPermittedTabs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {staffPermittedTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{tab.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{tab.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Top Financial Cards - Gross & Net Profit */}
      {isFullAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Gross Profit"
            value={formatMVR(grossProfit)}
            icon={RufiyaaIcon}
            trend={`${formatMVR(monthlyGrossProfit)} this month`}
            trendUp={grossProfit > 0}
            variant={grossProfit >= 0 ? "success" : "danger"}
            onClick={() => onTabChange?.("reports")}
            chartData={dailyProfitData.map(d => ({ value: d.gross, day: d.day }))}
            chartColor="#f97316"
          />
          <StatCard
            title="Net Profit"
            value={formatMVR(netProfit)}
            icon={RufiyaaIcon}
            trend={`${formatMVR(monthlyNetProfit)} this month`}
            trendUp={netProfit > 0}
            variant={netProfit >= 0 ? "primary" : "danger"}
            onClick={() => onTabChange?.("reports")}
            chartData={dailyProfitData.map(d => ({ value: d.net, day: d.day }))}
            chartColor="#f97316"
          />
        </div>
      )}

      {/* Secondary Financial Stats */}
      {isFullAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Total Revenue"
            value={formatMVR(stats.totalRevenue)}
            icon={TrendingUp}
            trend={`${formatMVR(stats.monthlyRevenue)} this month`}
            trendUp={true}
            variant="success"
            onClick={() => onTabChange?.("transactions")}
          />
          <StatCard
            title="Cost of Sold Items"
            value={formatMVR(stats.totalCOGS)}
            icon={Package}
            trend={`${formatMVR(stats.monthlyCOGS)} this month`}
            trendUp={false}
            variant="warning"
            onClick={() => onTabChange?.("reports")}
          />
          <StatCard
            title="Total Expenses"
            value={formatMVR(stats.totalExpenses)}
            icon={TrendingDown}
            trend={`${formatMVR(stats.monthlyExpenses)} this month`}
            trendUp={false}
            variant="danger"
            onClick={() => onTabChange?.("transactions")}
          />
          <StatCard
            title="Product Purchase"
            value={formatMVR(stats.totalInventoryCashOut)}
            icon={Package}
            trend={`${formatMVR(stats.monthlyInventoryCashOut)} this month`}
            trendUp={false}
            variant="warning"
            onClick={() => onTabChange?.("stock")}
          />
        </div>
      )}

      {/* Business Stats Row - only for full admins */}
      {isFullAdmin && (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStatCard
          title="Customers"
          value={stats.totalCustomers.toString()}
          icon={Users}
          subtitle="Registered users"
          onClick={() => onTabChange?.("users")}
        />
        <MiniStatCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          icon={ShoppingCart}
          subtitle={`${stats.pendingOrders} pending`}
          onClick={() => onTabChange?.("orders")}
        />
        <MiniStatCard
          title="On Delivery"
          value={stats.onDeliveryOrders.toString()}
          icon={Package}
          subtitle={`${stats.deliveredOrders} delivered`}
          onClick={() => onTabChange?.("deliveries")}
        />
        <MiniStatCard
          title="Confirmed"
          value={stats.confirmedOrders.toString()}
          icon={CheckCircle2}
          subtitle="Paid orders"
          onClick={() => onTabChange?.("orders")}
        />
        <MiniStatCard
          title="Products"
          value={stats.totalProducts.toString()}
          icon={Package}
          subtitle={`${stats.totalStockItems} in stock`}
          onClick={() => onTabChange?.("products")}
        />
        <MiniStatCard
          title="Low Stock"
          value={stats.lowStockProducts.toString()}
          icon={Package}
          subtitle="Need restock"
          highlight={stats.lowStockProducts > 0}
          onClick={() => onTabChange?.("stock")}
        />
      </div>
      )}

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
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Revenue */}
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                <p className="text-sm font-bold text-[hsl(var(--chart-2))]">{formatMVR(periodStats.income)}</p>
              </div>
              {/* Product Purchase (Cost) */}
              <div className="text-center p-3 rounded-xl bg-muted/30 border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-muted-foreground mb-1">Product Cost</p>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatMVR(periodStats.cashOut)}</p>
              </div>
              {/* Profit = Revenue - Cost */}
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Profit</p>
                <p className={`text-sm font-bold ${periodStats.income - periodStats.cashOut >= 0 ? "text-[hsl(var(--chart-2))]" : "text-destructive"}`}>
                  {formatMVR(periodStats.income - periodStats.cashOut)}
                </p>
              </div>
              {/* Total Expenses */}
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-sm font-bold text-destructive">{formatMVR(periodStats.expenses)}</p>
              </div>
              {/* Gross = Profit - Expenses */}
              <div className="text-center p-3 rounded-xl bg-primary/5">
                <p className="text-xs text-muted-foreground mb-1">Gross</p>
                <p className={`text-sm font-bold ${(periodStats.income - periodStats.cashOut - periodStats.expenses) >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatMVR(periodStats.income - periodStats.cashOut - periodStats.expenses)}
                </p>
              </div>
              {/* Inventory Value */}
              <div className="text-center p-3 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowStockDetails(true)}>
                <p className="text-xs text-muted-foreground mb-1">Inventory Value</p>
                <p className="text-sm font-bold text-foreground">{formatMVR(stats.stockValueCost)}</p>
                <p className="text-[9px] text-muted-foreground">{stats.totalStockItems} items</p>
              </div>
            </div>
          </div>
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
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Stock Value Breakdown
            </DialogTitle>
          </DialogHeader>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={stockCategoryFilter}
              onChange={(e) => setStockCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Categories</option>
              {stockCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Summary Cards */}
          {(() => {
            const filteredDetails = stockDetails.filter(p => {
              const matchesSearch = p.name.toLowerCase().includes(stockSearchQuery.toLowerCase());
              const matchesCategory = stockCategoryFilter === "all" || p.category_id === stockCategoryFilter;
              return matchesSearch && matchesCategory;
            });
            
            return (
              <>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
                  <div className="p-2 sm:p-3 rounded-xl bg-muted/30 text-center">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Total Cost</p>
                    <p className="text-sm sm:text-lg font-bold text-foreground">
                      {formatMVR(filteredDetails.reduce((sum, p) => sum + p.total_cost, 0))}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-xl bg-primary/10 text-center">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Total Selling</p>
                    <p className="text-sm sm:text-lg font-bold text-primary">
                      {formatMVR(filteredDetails.reduce((sum, p) => sum + p.total_selling, 0))}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-xl bg-accent/10 text-center">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Profit</p>
                    <p className="text-sm sm:text-lg font-bold text-accent">
                      {formatMVR(filteredDetails.reduce((sum, p) => sum + (p.total_selling - p.total_cost), 0))}
                    </p>
                  </div>
                </div>

                {/* Two Tables */}
                <ScrollArea className="h-[calc(100vh-420px)] sm:h-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Cost Price Table */}
                    <div className="space-y-2">
                      <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                        Cost Price
                      </h3>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="max-h-[250px] sm:max-h-[350px] overflow-y-auto scrollbar-thin">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="font-semibold text-xs py-2">Product</TableHead>
                                <TableHead className="text-center font-semibold text-xs py-2 w-10">Qty</TableHead>
                                <TableHead className="text-right font-semibold text-xs py-2">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredDetails.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">
                                    No products found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredDetails.map((product) => (
                                  <TableRow key={`cost-${product.id}`} className="hover:bg-muted/20">
                                    <TableCell className="py-2 pr-1">
                                      <div className="text-xs font-medium text-foreground leading-tight">
                                        {product.name}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {product.cost_price > 0 ? `${formatMVR(product.cost_price)}/unit` : "No cost"}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center text-xs py-2">{product.stock_quantity}</TableCell>
                                    <TableCell className="text-right text-xs font-medium py-2">
                                      {product.total_cost > 0 ? formatMVR(product.total_cost) : "-"}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-muted/20 text-center">
                        <p className="text-[10px] text-muted-foreground">
                          Total: <span className="font-semibold text-foreground">{formatMVR(filteredDetails.reduce((sum, p) => sum + p.total_cost, 0))}</span>
                        </p>
                      </div>
                    </div>

                    {/* Selling Price Table */}
                    <div className="space-y-2">
                      <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        Selling Price
                      </h3>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="max-h-[250px] sm:max-h-[350px] overflow-y-auto scrollbar-thin">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-primary/5">
                                <TableHead className="font-semibold text-xs py-2">Product</TableHead>
                                <TableHead className="text-center font-semibold text-xs py-2 w-10">Qty</TableHead>
                                <TableHead className="text-right font-semibold text-xs py-2">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredDetails.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">
                                    No products found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredDetails.map((product) => (
                                  <TableRow key={`sell-${product.id}`} className="hover:bg-muted/20">
                                    <TableCell className="py-2 pr-1">
                                      <div className="text-xs font-medium text-foreground leading-tight">
                                        {product.name}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {formatMVR(product.selling_price)}/unit
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center text-xs py-2">{product.stock_quantity}</TableCell>
                                    <TableCell className="text-right text-xs font-medium text-primary py-2">
                                      {formatMVR(product.total_selling)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-primary/10 text-center">
                        <p className="text-[10px] text-muted-foreground">
                          Total: <span className="font-semibold text-primary">{formatMVR(filteredDetails.reduce((sum, p) => sum + p.total_selling, 0))}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  {filteredDetails.length} of {stockDetails.length} products
                </p>
              </>
            );
          })()}
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
  onClick,
  chartData,
  chartColor,
}: {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp?: boolean;
  variant: "success" | "danger" | "primary" | "warning";
  className?: string;
  onClick?: () => void;
  chartData?: Array<{ value: number; day?: string }>;
  chartColor?: string;
}) => {
  const variantStyles = {
    success: "bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]",
    danger: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  };

  const chartColors: Record<string, string> = {
    success: "hsl(var(--chart-2))",
    danger: "hsl(var(--destructive))",
    primary: "hsl(var(--primary))",
    warning: "#d97706",
  };

  return (
    <div 
      className={`bg-card border border-border rounded-2xl p-3 ${onClick ? "cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${variantStyles[variant]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {trendUp !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs ${trendUp ? "text-[hsl(var(--chart-2))]" : "text-destructive"}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      <p className="text-sm sm:text-base font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{title}</p>
      {chartData && chartData.length > 0 && (
        <div className="h-10 mt-1.5 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-md">
                        <p className="text-[10px] text-muted-foreground">Day {data.day}</p>
                        <p className="text-xs font-semibold text-foreground">{formatMVR(data.value)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColor || chartColors[variant]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: chartColor || chartColors[variant], strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5">{trend}</p>
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
  onClick,
}: {
  title: string;
  value: string;
  icon: any;
  subtitle: string;
  highlight?: boolean;
  onClick?: () => void;
}) => {
  return (
    <div 
      className={`bg-card border rounded-xl p-3 text-center ${highlight ? "border-destructive/50 bg-destructive/5" : "border-border"} ${onClick ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
      onClick={onClick}
    >
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
