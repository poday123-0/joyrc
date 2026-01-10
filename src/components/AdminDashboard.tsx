import { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, Package, ShoppingCart, 
  DollarSign, Users, Plus, X, Trash2, Edit2, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Calendar, PieChart
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

    // Calculate stats
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Total Revenue"
          value={formatMVRCompact(stats.totalRevenue)}
          icon={TrendingUp}
          trend={`${formatMVR(stats.monthlyRevenue)} this month`}
          trendUp={true}
          color="mint"
        />
        <StatCard
          title="Total Expenses"
          value={formatMVRCompact(stats.totalExpenses)}
          icon={TrendingDown}
          trend={`${formatMVR(stats.monthlyExpenses)} this month`}
          trendUp={false}
          color="coral"
        />
        <StatCard
          title="Net Profit"
          value={formatMVRCompact(netProfit)}
          icon={DollarSign}
          trend={`${formatMVR(monthlyNetProfit)} this month`}
          trendUp={monthlyNetProfit > 0}
          color={netProfit >= 0 ? "teal" : "coral"}
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          icon={ShoppingCart}
          trend={`${stats.pendingOrders} pending`}
          color="cyan"
        />
        <StatCard
          title="Products"
          value={stats.totalProducts.toString()}
          icon={Package}
          trend="In catalog"
          color="pink"
        />
        <StatCard
          title="Confirmed"
          value={stats.confirmedOrders.toString()}
          icon={CheckCircle2}
          trend="Paid orders"
          trendUp={true}
          color="mint"
        />
      </div>

      {/* Quick Stats Bar */}
      <div className="glass-card rounded-2xl p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mint to-teal flex items-center justify-center">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="font-bold text-foreground">
                {monthlyNetProfit >= 0 ? "+" : ""}{formatMVR(monthlyNetProfit)}
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Income</p>
              <p className="font-semibold text-mint">{formatMVRCompact(stats.monthlyRevenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Expenses</p>
              <p className="font-semibold text-coral">{formatMVRCompact(stats.monthlyExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Transactions</h3>
          <button
            onClick={() => setShowTransactionForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium shadow-soft"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>

        {showTransactionForm && (
          <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">
                {editingTransaction ? "Edit Transaction" : "New Transaction"}
              </h4>
              <button onClick={resetForm}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "income" })}
                  className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                    formData.type === "income"
                      ? "bg-mint text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 inline mr-1" /> Income
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "expense" })}
                  className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                    formData.type === "expense"
                      ? "bg-coral text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 inline mr-1" /> Expense
                </button>
              </div>

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
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
                className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />

              <input
                type="text"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : editingTransaction ? "Update Transaction" : "Add Transaction"}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {transactions.slice(0, 20).map((tx) => (
            <div key={tx.id} className="glass-card rounded-xl p-3 flex items-center gap-3 shadow-soft">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                tx.type === "income" ? "bg-mint/20" : "bg-coral/20"
              }`}>
                {tx.type === "income" ? (
                  <ArrowUpRight className="w-5 h-5 text-mint" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-coral" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{tx.category}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {tx.description || new Date(tx.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${tx.type === "income" ? "text-mint" : "text-coral"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatMVR(tx.amount)}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(tx)}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteClick(tx.id)}
                  className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No transactions yet</p>
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

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp?: boolean;
  color: string;
}) => {
  const colorClasses: Record<string, string> = {
    mint: "from-mint/20 to-mint/5 text-mint",
    coral: "from-coral/20 to-coral/5 text-coral",
    teal: "from-teal/20 to-teal/5 text-teal",
    cyan: "from-cyan/20 to-cyan/5 text-cyan",
    pink: "from-pink/20 to-pink/5 text-pink",
  };

  return (
    <div className="glass-card rounded-2xl p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground mt-3">{value}</p>
      <p className="text-xs text-muted-foreground">{title}</p>
      <div className="flex items-center gap-1 mt-1">
        {trendUp !== undefined && (
          trendUp ? (
            <ArrowUpRight className="w-3 h-3 text-mint" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-coral" />
          )
        )}
        <span className="text-xs text-muted-foreground">{trend}</span>
      </div>
    </div>
  );
};

export default AdminDashboard;
