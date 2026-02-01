import { useState, useMemo } from "react";
import { 
  ArrowUpRight, ArrowDownRight, Calendar, TrendingUp, TrendingDown,
  Package, Truck, User, Filter, ChevronDown, ShoppingCart, Wallet, 
  CreditCard, Gift, Briefcase, Home, Zap, DollarSign, Receipt, 
  ShoppingBag, Banknote, PiggyBank, TrendingDown as ExpenseIcon,
  icons
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMVR } from "@/lib/currency";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
}

interface TransactionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "income" | "expense";
  transactions: Transaction[];
}

type DateFilter = "this_month" | "last_month" | "this_year" | "all" | "custom";

// Icon mapping for categories
const getCategoryIcon = (category: string, isIncome: boolean) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "Product Sales": ShoppingCart,
    "Order Payment": CreditCard,
    "Service": Briefcase,
    "Gift": Gift,
    "Refund": Wallet,
    "Other Income": DollarSign,
    "Product Purchase": ShoppingBag,
    "Shipping": Truck,
    "Packaging": Package,
    "Marketing": Zap,
    "Utilities": Home,
    "Rent": Home,
    "Salary": Banknote,
    "Other Expense": Receipt,
    "Stock Purchase": Package,
  };
  
  return iconMap[category] || (isIncome ? PiggyBank : ExpenseIcon);
};

const TransactionDetailSheet = ({ open, onOpenChange, type, transactions }: TransactionDetailSheetProps) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_month");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const isIncome = type === "income";

  // Filter transactions by type
  const typeFilteredTransactions = transactions.filter(tx => tx.type === type);

  // Get unique categories with counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    typeFilteredTransactions.forEach(tx => {
      counts[tx.category] = (counts[tx.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [typeFilteredTransactions]);

  // Apply date and category filters
  const filteredTransactions = useMemo(() => {
    let filtered = typeFilteredTransactions;

    // Date filter
    const now = new Date();
    let dateRange: { start: Date; end: Date } | null = null;

    switch (dateFilter) {
      case "this_month":
        dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        dateRange = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        break;
      case "this_year":
        dateRange = { start: startOfYear(now), end: endOfYear(now) };
        break;
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          dateRange = { start: customDateRange.from, end: customDateRange.to };
        }
        break;
      case "all":
      default:
        dateRange = null;
    }

    if (dateRange) {
      filtered = filtered.filter(tx => 
        isWithinInterval(new Date(tx.created_at), dateRange!)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(tx => tx.category === selectedCategory);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [typeFilteredTransactions, dateFilter, customDateRange, selectedCategory]);

  // Calculate totals and category breakdown
  const total = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { total: number; count: number }> = {};
    filteredTransactions.forEach(tx => {
      if (!breakdown[tx.category]) {
        breakdown[tx.category] = { total: 0, count: 0 };
      }
      breakdown[tx.category].total += tx.amount;
      breakdown[tx.category].count++;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1].total - a[1].total);
  }, [filteredTransactions]);

  const dateFilterLabels: Record<DateFilter, string> = {
    this_month: "This Month",
    last_month: "Last Month",
    this_year: "This Year",
    all: "All Time",
    custom: customDateRange.from && customDateRange.to 
      ? `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d, yyyy")}`
      : "Custom Range",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className={cn(
            "p-6 pb-4 border-b border-border",
            isIncome ? "bg-emerald-500/5" : "bg-rose-500/5"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  isIncome ? "bg-emerald-500/10" : "bg-rose-500/10"
                )}>
                  {isIncome ? (
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-rose-500" />
                  )}
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-foreground">
                    {isIncome ? "Income Details" : "Expense Details"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Total Amount */}
            <div className={cn(
              "mt-4 p-4 rounded-xl",
              isIncome ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-rose-500/10 border border-rose-500/20"
            )}>
              <p className="text-xs text-muted-foreground mb-1">
                Total {isIncome ? "Income" : "Expenses"} ({dateFilterLabels[dateFilter]})
              </p>
              <p className={cn(
                "text-2xl font-bold",
                isIncome ? "text-emerald-600" : "text-rose-500"
              )}>
                {formatMVR(total)}
              </p>
            </div>
          </SheetHeader>

          {/* Category Cards */}
          <div className="p-4 border-b border-border bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground mb-3">Filter by Category</p>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {/* All Categories Card */}
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all min-w-[80px]",
                    selectedCategory === "all"
                      ? isIncome 
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25" 
                        : "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/25"
                      : "bg-background border-border hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    selectedCategory === "all" 
                      ? "bg-white/20" 
                      : isIncome ? "bg-emerald-500/10" : "bg-rose-500/10"
                  )}>
                    <Filter className={cn(
                      "w-4 h-4",
                      selectedCategory === "all" 
                        ? "text-white" 
                        : isIncome ? "text-emerald-600" : "text-rose-500"
                    )} />
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    selectedCategory === "all" ? "text-white" : "text-foreground"
                  )}>
                    All
                  </span>
                  <span className={cn(
                    "text-[10px]",
                    selectedCategory === "all" ? "text-white/80" : "text-muted-foreground"
                  )}>
                    {typeFilteredTransactions.length}
                  </span>
                </button>

                {/* Category Cards */}
                {categoriesWithCounts.map(({ name, count }) => {
                  const IconComponent = getCategoryIcon(name, isIncome);
                  const isSelected = selectedCategory === name;
                  
                  return (
                    <button
                      key={name}
                      onClick={() => setSelectedCategory(name)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all min-w-[80px]",
                        isSelected
                          ? isIncome 
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25" 
                            : "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/25"
                          : "bg-background border-border hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isSelected 
                          ? "bg-white/20" 
                          : isIncome ? "bg-emerald-500/10" : "bg-rose-500/10"
                      )}>
                        <IconComponent className={cn(
                          "w-4 h-4",
                          isSelected 
                            ? "text-white" 
                            : isIncome ? "text-emerald-600" : "text-rose-500"
                        )} />
                      </div>
                      <span className={cn(
                        "text-xs font-medium text-center line-clamp-1 max-w-[70px]",
                        isSelected ? "text-white" : "text-foreground"
                      )}>
                        {name.replace("Product ", "").replace("Other ", "")}
                      </span>
                      <span className={cn(
                        "text-[10px]",
                        isSelected ? "text-white/80" : "text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Date Filters */}
          <div className="p-4 border-b border-border bg-muted/30">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between w-full text-sm font-medium text-foreground"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Date Range: {dateFilterLabels[dateFilter]}
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                showFilters && "rotate-180"
              )} />
            </button>
            
            {showFilters && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {(["this_month", "last_month", "this_year", "all"] as DateFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        dateFilter === filter
                          ? isIncome ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {dateFilterLabels[filter]}
                    </button>
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                          dateFilter === "custom"
                            ? isIncome ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        <Calendar className="w-3 h-3" />
                        Custom
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        selected={{ from: customDateRange.from, to: customDateRange.to }}
                        onSelect={(range) => {
                          setCustomDateRange({ from: range?.from, to: range?.to });
                          if (range?.from && range?.to) {
                            setDateFilter("custom");
                          }
                        }}
                        numberOfMonths={1}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="p-4 border-b border-border">
              <h4 className="text-xs font-medium text-muted-foreground mb-3">Category Breakdown</h4>
              <div className="space-y-2">
                {categoryBreakdown.map(([category, data]) => {
                  const percentage = (data.total / total) * 100;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{category}</span>
                        <span className={cn(
                          "font-semibold",
                          isIncome ? "text-emerald-600" : "text-rose-500"
                        )}>
                          {formatMVR(data.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              isIncome ? "bg-emerald-500" : "bg-rose-500"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {data.count} transaction{data.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-3">All Transactions</h4>
              <div className="space-y-3">
                {filteredTransactions.map((tx) => {
                  const IconComponent = getCategoryIcon(tx.category, isIncome);
                  const hasOrderDetails = tx.order_id && (tx.customer_name || tx.customer_phone);
                  const hasProductDetails = tx.product_name || (tx.quantity && tx.unit_purchase_price);
                  const hasCostDetails = tx.shipping_cost || tx.other_costs;
                  const hasExtraDetails = hasOrderDetails || hasProductDetails || hasCostDetails || tx.profile?.full_name;
                  
                  return (
                    <div 
                      key={tx.id} 
                      className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            isIncome ? "bg-emerald-500/10" : "bg-rose-500/10"
                          )}>
                            <IconComponent className={cn(
                              "w-5 h-5",
                              isIncome ? "text-emerald-600" : "text-rose-500"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{tx.category}</p>
                            {tx.order_id && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Order #{tx.order_id.slice(0, 8).toUpperCase()}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <p className={cn(
                          "font-bold text-base flex-shrink-0",
                          isIncome ? "text-emerald-600" : "text-rose-500"
                        )}>
                          {isIncome ? "+" : "-"}{formatMVR(tx.amount)}
                        </p>
                      </div>

                      {/* Details Section */}
                      {hasExtraDetails && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          {/* Product Info */}
                          {tx.product_name && (
                            <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                              <Package className={cn("w-4 h-4", isIncome ? "text-emerald-600" : "text-rose-500")} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{tx.product_name}</p>
                                {tx.quantity && tx.unit_purchase_price && (
                                  <p className="text-xs text-muted-foreground">
                                    {tx.quantity} × {formatMVR(tx.unit_purchase_price)} = {formatMVR(tx.quantity * tx.unit_purchase_price)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Customer Info (for income/sales) */}
                          {isIncome && (tx.customer_name || tx.customer_phone) && (
                            <div className="flex items-start gap-2 p-2 bg-emerald-500/5 rounded-lg">
                              <User className="w-4 h-4 text-emerald-600 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {tx.customer_name || "Unknown Customer"}
                                </p>
                                {tx.customer_phone && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    📞 {tx.customer_phone}
                                  </p>
                                )}
                                {tx.customer_address && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                                    📍 {tx.customer_address}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Cost Breakdown */}
                          {hasCostDetails && (
                            <div className="grid grid-cols-2 gap-2">
                              {tx.shipping_cost !== null && tx.shipping_cost > 0 && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Shipping: <span className="font-medium text-foreground">{formatMVR(tx.shipping_cost)}</span></span>
                                </div>
                              )}
                              {tx.other_costs !== null && tx.other_costs > 0 && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Other: <span className="font-medium text-foreground">{formatMVR(tx.other_costs)}</span></span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Description */}
                          {tx.description && (
                            <p className="text-xs text-muted-foreground italic px-1">
                              "{tx.description}"
                            </p>
                          )}

                          {/* Added By */}
                          {tx.profile?.full_name && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                              <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px]">👤</span>
                              <span>Recorded by <span className="font-medium text-foreground">{tx.profile.full_name}</span></span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Simple description if no extra details */}
                      {!hasExtraDetails && tx.description && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          "{tx.description}"
                        </p>
                      )}
                    </div>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <div className={cn(
                      "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center",
                      isIncome ? "bg-emerald-500/10" : "bg-rose-500/10"
                    )}>
                      {isIncome ? (
                        <ArrowUpRight className="w-6 h-6 text-emerald-600/50" />
                      ) : (
                        <ArrowDownRight className="w-6 h-6 text-rose-500/50" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      No {isIncome ? "income" : "expenses"} found
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Try adjusting your filters
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TransactionDetailSheet;
