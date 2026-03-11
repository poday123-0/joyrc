import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { History, Trash2, Package, TrendingUp, TrendingDown, Calendar as CalendarIcon, Filter, X, Search, Hash } from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface StockHistoryItem {
  id: string;
  previous_quantity: number;
  new_quantity: number;
  change_amount: number;
  change_type: string;
  notes: string | null;
  created_at: string;
  unit_purchase_price?: number | null;
  shipping_cost?: number | null;
  other_expenses?: number | null;
  total_expense?: number | null;
  order_id?: string | null;
  profile?: { full_name: string | null } | null;
  product_name?: string;
  product_item_code?: string | null;
}

interface StockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  stockHistory: StockHistoryItem[];
  loading: boolean;
  isSuperAdmin: boolean;
  onDeleteHistory: (historyId: string) => void;
  showProductFilter?: boolean;
  inline?: boolean;
}

type PeriodFilter = "all" | "today" | "week" | "month" | "year" | "custom";
type TypeFilter = "all" | "sale" | "restock" | "adjustment" | "return";

const getChangeTypeLabel = (type: string) => {
  switch (type) {
    case "sale": return "Sale";
    case "restock": return "Restock";
    case "adjustment": return "Adjust";
    case "return": return "Return";
    default: return type;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const StockHistoryDialog = ({
  open,
  onOpenChange,
  productName,
  stockHistory,
  loading,
  isSuperAdmin,
  onDeleteHistory,
  showProductFilter = false,
  inline = false,
}: StockHistoryDialogProps) => {
  const isMobile = useIsMobile();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [productSearch, setProductSearch] = useState("");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filter history based on selected filters
  const filteredHistory = useMemo(() => {
    let filtered = [...stockHistory];

    // Filter by product search (name or item code)
    if (showProductFilter && productSearch.trim()) {
      const search = productSearch.toLowerCase().trim();
      filtered = filtered.filter(item => 
        (item.product_name?.toLowerCase().includes(search)) ||
        (item.product_item_code?.toLowerCase().includes(search)) ||
        (item.notes?.toLowerCase().includes(search))
      );
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(item => item.change_type === typeFilter);
    }

    // Filter by period
    if (periodFilter !== "all") {
      const now = new Date();
      let start: Date;
      let end: Date;

      switch (periodFilter) {
        case "today":
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case "week":
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "month":
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case "year":
          start = startOfYear(now);
          end = endOfYear(now);
          break;
        case "custom":
          if (customDateRange.from && customDateRange.to) {
            start = startOfDay(customDateRange.from);
            end = endOfDay(customDateRange.to);
          } else {
            return filtered;
          }
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return isWithinInterval(itemDate, { start, end });
      });
    }

    return filtered;
  }, [stockHistory, periodFilter, typeFilter, customDateRange, productSearch, showProductFilter]);

  // Calculate stats based on filtered history
  const stats = useMemo(() => ({
    added: filteredHistory.filter(h => h.change_amount > 0).reduce((acc, h) => acc + h.change_amount, 0),
    removed: Math.abs(filteredHistory.filter(h => h.change_amount < 0).reduce((acc, h) => acc + h.change_amount, 0)),
    entries: filteredHistory.length,
  }), [filteredHistory]);

  const hasActiveFilters = periodFilter !== "all" || typeFilter !== "all" || (showProductFilter && productSearch.trim() !== "");

  const clearFilters = () => {
    setPeriodFilter("all");
    setTypeFilter("all");
    setProductSearch("");
    setCustomDateRange({ from: undefined, to: undefined });
  };

  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
    { value: "custom", label: "Custom" },
  ];

  const typeOptions: { value: TypeFilter; label: string; color: string }[] = [
    { value: "all", label: "All Types", color: "bg-muted text-foreground" },
    { value: "sale", label: "Sales", color: "bg-blue-500/20 text-blue-600" },
    { value: "restock", label: "Restocks", color: "bg-emerald-500/20 text-emerald-600" },
    { value: "adjustment", label: "Adjustments", color: "bg-amber-500/20 text-amber-600" },
    { value: "return", label: "Returns", color: "bg-purple-500/20 text-purple-600" },
  ];

  const content = (
    <div className="flex flex-col h-full">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={cn(
          "flex items-center justify-center gap-2 px-3 py-2 mb-3 rounded-lg text-sm font-medium transition-colors",
          showFilters || hasActiveFilters
            ? "bg-primary/10 text-primary"
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
        )}
      >
        <Filter className="w-4 h-4" />
        Filters
        {hasActiveFilters && (
          <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] rounded-full">
            {(periodFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (showProductFilter && productSearch.trim() ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-3 bg-muted/30 rounded-xl border border-border/50 space-y-3">
          {/* Product Search - only when showProductFilter is true */}
          {showProductFilter && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Search Product</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by name, item code, or notes..."
                  className="pl-9 h-9 text-sm"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Period Filter */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Time Period</p>
            <div className="flex flex-wrap gap-1.5">
              {periodOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPeriodFilter(option.value);
                    if (option.value !== "custom") {
                      setCustomDateRange({ from: undefined, to: undefined });
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    periodFilter === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            {periodFilter === "custom" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-xs">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {customDateRange.from ? format(customDateRange.from, "MMM d, yyyy") : "Start date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateRange.from}
                      onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-xs">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {customDateRange.to ? format(customDateRange.to, "MMM d, yyyy") : "End date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateRange.to}
                      onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Type Filter */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Change Type</p>
            <div className="flex flex-wrap gap-1.5">
              {typeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTypeFilter(option.value)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    typeFilter === option.value
                      ? option.color
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Stats Summary */}
      {filteredHistory.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-center">
            <TrendingUp className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-emerald-600">{stats.added}</p>
            <p className="text-[10px] text-muted-foreground">Added</p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-lg text-center">
            <TrendingDown className="w-4 h-4 text-rose-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-rose-500">{stats.removed}</p>
            <p className="text-[10px] text-muted-foreground">Sold/Removed</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <Package className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{stats.entries}</p>
            <p className="text-[10px] text-muted-foreground">Entries</p>
          </div>
        </div>
      )}

      {/* History List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <History className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">{hasActiveFilters ? "No matching history" : "No stock history yet"}</p>
          <p className="text-xs">{hasActiveFilters ? "Try adjusting your filters" : "Changes will appear here"}</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg hover:bg-primary/20 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-4 px-4" style={{ maxHeight: isMobile ? "50vh" : "350px" }}>
          <div className="space-y-2 pb-4">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-muted/50 rounded-xl border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Product name (only in global view) */}
                    {showProductFilter && item.product_name && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-medium text-foreground truncate">{item.product_name}</span>
                        {item.product_item_code && (
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                            {item.product_item_code}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Change badge and type */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.change_amount > 0
                            ? "bg-emerald-500/20 text-emerald-600"
                            : "bg-rose-500/20 text-rose-500"
                        }`}
                      >
                        {item.change_amount > 0 ? "+" : ""}
                        {item.change_amount}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.change_type === "sale"
                            ? "bg-blue-500/20 text-blue-600"
                            : item.change_type === "restock"
                            ? "bg-emerald-500/20 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {getChangeTypeLabel(item.change_type)}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {item.previous_quantity} → {item.new_quantity}
                      </span>
                    </div>

                    {/* Performed by & Order info */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground mb-1">
                      {item.profile?.full_name && (
                        <span className="font-medium text-foreground/70">
                          {item.profile.full_name}
                        </span>
                      )}
                      {item.profile?.full_name && (
                        <span>•</span>
                      )}
                      <span>{formatDate(item.created_at)}</span>
                      {item.order_id && item.change_type === "sale" && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Order #{item.order_id.slice(0, 8).toUpperCase()}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic truncate">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-2 flex-shrink-0">
                    {isSuperAdmin && (
                      <button
                        onClick={() => onDeleteHistory(item.id)}
                        className="p-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cost details */}
                {item.total_expense && item.total_expense > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-muted-foreground">
                      Unit: <span className="text-foreground font-medium">{formatMVR(item.unit_purchase_price || 0)}</span>
                    </span>
                    {item.shipping_cost && item.shipping_cost > 0 && (
                      <span className="text-muted-foreground">
                        Ship: <span className="text-foreground">{formatMVR(item.shipping_cost)}</span>
                      </span>
                    )}
                    {item.other_expenses && item.other_expenses > 0 && (
                      <span className="text-muted-foreground">
                        Other: <span className="text-foreground">{formatMVR(item.other_expenses)}</span>
                      </span>
                    )}
                    <span className="ml-auto font-semibold text-primary">
                      Total: {formatMVR(item.total_expense)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  // Inline mode - render content directly without dialog/sheet wrapper
  if (inline) {
    if (!open) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <History className="w-5 h-5 text-primary" />
            <span className="truncate">{productName}</span>
          </h3>
        </div>
        {content}
      </div>
    );
  }

  // Use Sheet on mobile for better UX
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="flex items-center gap-2 text-left">
              <History className="w-5 h-5 text-primary" />
              <span className="truncate">{productName}</span>
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <span className="truncate">{productName}</span>
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
