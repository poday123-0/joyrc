import { useState, useEffect } from "react";
import { 
  Plus, X, Trash2, Edit2, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Calendar, Download, Package, Truck, User, ChevronDown, ChevronUp, Settings2,
  Hash, CreditCard, Phone, MapPin, UserCheck, ShoppingBag, Boxes
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import TransactionDetailSheet from "@/components/TransactionDetailSheet";
import TransactionCategoriesTab from "@/components/TransactionCategoriesTab";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
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
    } else {
      // Fetch profile names for added_by users and customer info for orders
      const transactionsWithDetails = await Promise.all(
        (data || []).map(async (tx) => {
          let profile = null;
          let customer_name = null;
          let customer_phone = null;
          let customer_address = null;

          // Get profile of who added this transaction
          if (tx.added_by) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", tx.added_by)
              .single();
            profile = profileData;
          }

          // Get customer info from order if this is linked to an order
          let item_code = null;
          let sold_by_name = null;
          let payment_method = null;
          let order_status = null;

          if (tx.order_id) {
            const { data: orderData } = await supabase
              .from("orders")
              .select("user_id, phone, shipping_address, payment_method, status, assigned_to")
              .eq("id", tx.order_id)
              .single();
            
            if (orderData) {
              customer_phone = orderData.phone;
              customer_address = orderData.shipping_address;
              payment_method = orderData.payment_method;
              order_status = orderData.status;
              
              // Get customer name from profile
              if (orderData.user_id) {
                const { data: customerProfile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("user_id", orderData.user_id)
                  .single();
                customer_name = customerProfile?.full_name || null;
              }

              // Get sold by name (assigned_to or added_by)
              const soldById = orderData.assigned_to || tx.added_by;
              if (soldById) {
                const { data: soldByProfile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("user_id", soldById)
                  .single();
                sold_by_name = soldByProfile?.full_name || null;
              }
            }

            // Get item code from order_items -> products
            if (tx.product_name) {
              const { data: orderItems } = await supabase
                .from("order_items")
                .select("product_id")
                .eq("order_id", tx.order_id)
                .limit(1);
              
              if (orderItems && orderItems.length > 0) {
                const { data: productData } = await supabase
                  .from("products")
                  .select("item_code")
                  .eq("id", orderItems[0].product_id)
                  .single();
                item_code = productData?.item_code || null;
              }
            }
          }

          return { 
            ...tx, 
            profile,
            customer_name,
            customer_phone,
            customer_address,
            item_code,
            sold_by_name,
            payment_method,
            order_status
          };
        })
      );
      setTransactions(transactionsWithDetails as Transaction[]);
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

  // Get categories for the selected type
  const expenseCategories = categories.filter(c => c.type === "expense").map(c => c.name);
  const incomeCategories = categories.filter(c => c.type === "income").map(c => c.name);

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
  
  // Separate inventory/stock purchases from other expenses
  const inventoryExpenses = filteredTransactions
    .filter(tx => tx.type === "expense" && 
      (tx.category.toLowerCase().includes("inventory") || 
       tx.category.toLowerCase().includes("stock") ||
       tx.category.toLowerCase().includes("product") ||
       tx.product_name)) // Has product_name = stock purchase
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const otherExpenses = totalExpenses - inventoryExpenses;

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
          className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15 transition-colors"
          onClick={() => {
            setDetailSheetType("income");
            setDetailSheetOpen(true);
          }}
        >
          <p className="text-xs text-muted-foreground mb-1">Total Income</p>
          <p className="text-lg font-bold text-emerald-600">{formatMVR(totalIncome)}</p>
        </div>
        <div 
          className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 cursor-pointer hover:bg-rose-500/15 transition-colors"
          onClick={() => {
            setDetailSheetType("expense");
            setDetailSheetOpen(true);
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Other Expenses</p>
          </div>
          <p className="text-lg font-bold text-rose-500">{formatMVR(otherExpenses)}</p>
        </div>
        <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Boxes className="w-3 h-3 text-amber-600" />
            <p className="text-xs text-muted-foreground">Inventory Purchases</p>
          </div>
          <p className="text-lg font-bold text-amber-600">{formatMVR(inventoryExpenses)}</p>
        </div>
        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
          <p className={`text-lg font-bold ${totalIncome - otherExpenses >= 0 ? "text-primary" : "text-rose-500"}`}>
            {formatMVR(totalIncome - otherExpenses)}
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
        
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
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
