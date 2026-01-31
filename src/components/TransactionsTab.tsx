import { useState, useEffect } from "react";
import { 
  Plus, X, Trash2, Edit2, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Calendar, Download, Package, Truck, User, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";

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
}

const TransactionsTab = () => {
  const { isSuperAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

  useEffect(() => {
    fetchTransactions();
  }, []);

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
    } else {
      // Fetch profile names for added_by users
      const transactionsWithProfiles = await Promise.all(
        (data || []).map(async (tx) => {
          let profile = null;
          if (tx.added_by) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", tx.added_by)
              .single();
            profile = profileData;
          }
          return { ...tx, profile };
        })
      );
      setTransactions(transactionsWithProfiles as Transaction[]);
    }
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

  const expenseCategories = ["Inventory", "Shipping", "Marketing", "Utilities", "Rent", "Salaries", "Equipment", "Other"];
  const incomeCategories = ["Product Sales", "Services", "Refund Reversed", "Other"];

  // Filter and search transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = filterType === "all" || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(tx => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = filteredTransactions
    .filter(tx => tx.type === "expense")
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
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <p className="text-xs text-muted-foreground mb-1">Total Income</p>
          <p className="text-lg font-bold text-emerald-600">{formatMVR(totalIncome)}</p>
        </div>
        <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-lg font-bold text-rose-500">{formatMVR(totalExpenses)}</p>
        </div>
        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
          <p className={`text-lg font-bold ${totalIncome - totalExpenses >= 0 ? "text-primary" : "text-rose-500"}`}>
            {formatMVR(totalIncome - totalExpenses)}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as "all" | "income" | "expense")}
          className="px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Types</option>
          <option value="income">Income Only</option>
          <option value="expense">Expenses Only</option>
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

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
          <p className="text-sm font-medium text-foreground">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </p>
        </div>
        
        <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
          {filteredTransactions.map((tx) => {
            const hasStockDetails = tx.product_name || tx.unit_purchase_price || tx.shipping_cost || tx.other_costs;
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
                      {tx.profile?.full_name && (
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
    </div>
  );
};

export default TransactionsTab;
