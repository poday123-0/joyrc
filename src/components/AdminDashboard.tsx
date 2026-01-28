import { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, Package, ShoppingCart, 
  DollarSign, Users, Plus, X, Trash2, Edit2, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Calendar, PieChart, Wallet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR, formatMVRCompact } from "@/lib/currency";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  totalProducts: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    totalProducts: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const [
      ordersRes,
      productsRes,
      transactionsRes,
      monthlyTransactionsRes
    ] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("products").select("id", { count: "exact" }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").gte("created_at", startOfMonth),
    ]);

    const orders = ordersRes.data || [];
    const allTransactions = transactionsRes.data || [];
    const monthlyTxns = monthlyTransactionsRes.data || [];

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

    setStats({
      totalRevenue,
      totalExpenses,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === "pending" || o.payment_status === "pending").length,
      confirmedOrders: orders.filter(o => o.payment_status === "confirmed").length,
      totalProducts: productsRes.count || 0,
      monthlyRevenue,
      monthlyExpenses,
    });

    setTransactions(allTransactions as Transaction[]);
    setLoading(false);
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Dashboard Overview</h2>
        <p className="text-xs text-muted-foreground">Monitor your business performance</p>
      </div>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Total Revenue"
          value={formatMVRCompact(stats.totalRevenue)}
          icon={TrendingUp}
          trend={`${formatMVR(stats.monthlyRevenue)} this month`}
          trendUp={true}
          variant="success"
        />
        <StatCard
          title="Total Expenses"
          value={formatMVRCompact(stats.totalExpenses)}
          icon={TrendingDown}
          trend={`${formatMVR(stats.monthlyExpenses)} this month`}
          trendUp={false}
          variant="danger"
        />
        <StatCard
          title="Net Profit"
          value={formatMVRCompact(netProfit)}
          icon={Wallet}
          trend={`${formatMVR(monthlyNetProfit)} this month`}
          trendUp={monthlyNetProfit > 0}
          variant={netProfit >= 0 ? "primary" : "danger"}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStatCard
          title="Orders"
          value={stats.totalOrders.toString()}
          icon={ShoppingCart}
          subtitle={`${stats.pendingOrders} pending`}
        />
        <MiniStatCard
          title="Products"
          value={stats.totalProducts.toString()}
          icon={Package}
          subtitle="In catalog"
        />
        <MiniStatCard
          title="Confirmed"
          value={stats.confirmedOrders.toString()}
          icon={CheckCircle2}
          subtitle="Paid orders"
        />
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Monthly Summary</p>
            <p className="text-xs text-muted-foreground">Current month performance</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Income</p>
            <p className="text-sm font-bold text-emerald-600">{formatMVRCompact(stats.monthlyRevenue)}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
            <p className="text-sm font-bold text-rose-500">{formatMVRCompact(stats.monthlyExpenses)}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">Net</p>
            <p className={`text-sm font-bold ${monthlyNetProfit >= 0 ? "text-primary" : "text-rose-500"}`}>
              {monthlyNetProfit >= 0 ? "+" : ""}{formatMVRCompact(monthlyNetProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
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
}: {
  title: string;
  value: string;
  icon: any;
  subtitle: string;
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <div className="w-8 h-8 rounded-lg bg-muted mx-auto mb-2 flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{title}</p>
      <p className="text-[9px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
    </div>
  );
};

export default AdminDashboard;
