import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { History, Trash2, Package, TrendingUp, TrendingDown } from "lucide-react";
import { formatMVR } from "@/lib/currency";

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
}

interface StockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  stockHistory: StockHistoryItem[];
  loading: boolean;
  isSuperAdmin: boolean;
  onDeleteHistory: (historyId: string) => void;
}

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
}: StockHistoryDialogProps) => {
  const isMobile = useIsMobile();

  const content = (
    <div className="flex flex-col h-full">
      {/* Stats Summary */}
      {stockHistory.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-center">
            <TrendingUp className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-emerald-600">
              {stockHistory.filter(h => h.change_amount > 0).reduce((acc, h) => acc + h.change_amount, 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">Added</p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-lg text-center">
            <TrendingDown className="w-4 h-4 text-rose-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-rose-500">
              {Math.abs(stockHistory.filter(h => h.change_amount < 0).reduce((acc, h) => acc + h.change_amount, 0))}
            </p>
            <p className="text-[10px] text-muted-foreground">Sold/Removed</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <Package className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{stockHistory.length}</p>
            <p className="text-[10px] text-muted-foreground">Entries</p>
          </div>
        </div>
      )}

      {/* History List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stockHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <History className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">No stock history yet</p>
          <p className="text-xs">Changes will appear here</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-4 px-4" style={{ maxHeight: isMobile ? "60vh" : "400px" }}>
          <div className="space-y-2 pb-4">
            {stockHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-muted/50 rounded-xl border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
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

                    {/* Order/User info */}
                    {(item.order_id || item.profile?.full_name) && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {item.order_id && item.change_type === "sale" && (
                          <span className="text-blue-600 font-medium">
                            Order #{item.order_id.slice(0, 8).toUpperCase()}
                          </span>
                        )}
                        {item.profile?.full_name && (
                          <span className="ml-2">by {item.profile.full_name}</span>
                        )}
                      </p>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic truncate">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-2 flex-shrink-0">
                    <p className="text-xs text-muted-foreground text-right">
                      {formatDate(item.created_at)}
                    </p>
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

  // Use Sheet on mobile for better UX
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
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
      <DialogContent className="sm:max-w-lg">
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
