import { useState, useEffect } from "react";
import { 
  Clock, CheckCircle, XCircle, Receipt, Eye, 
  ChevronDown, ChevronUp, CreditCard, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Order {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  receipt_url: string | null;
  shipping_address: string | null;
  phone: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

const PaymentOrdersTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const fetchOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) return;

    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (!error && data) {
      setOrderItems((prev) => ({ ...prev, [orderId]: data }));
    }
  };

  const handleToggleExpand = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      fetchOrderItems(orderId);
    }
  };

  const sendOrderEmail = async (orderId: string, templateKey: string) => {
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          type: "order_update",
          template_key: templateKey,
          order_id: orderId,
        },
      });
      console.log(`Email sent: ${templateKey} for order ${orderId}`);
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrderId) return;

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;

    try {
      // Get current user for tracking who confirmed
      const { data: { user } } = await supabase.auth.getUser();
      const confirmedBy = user?.id || null;

      // Get order items to deduct stock
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, product_name, quantity")
        .eq("order_id", selectedOrderId);

      if (itemsError) throw itemsError;

      // Deduct stock for each item and record history
      for (const item of items || []) {
        // Get current stock
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (productError) {
          console.error(`Failed to get product ${item.product_id}:`, productError);
          continue;
        }

        const currentQty = product.stock_quantity || 0;
        const newQty = Math.max(0, currentQty - item.quantity);

        // Update product stock
        const { error: updateError } = await supabase
          .from("products")
          .update({ 
            stock_quantity: newQty,
            in_stock: newQty > 0
          })
          .eq("id", item.product_id);

        if (updateError) {
          console.error(`Failed to update stock for ${item.product_id}:`, updateError);
          continue;
        }

        // Record stock history with order reference
        const { error: historyError } = await supabase
          .from("stock_history")
          .insert({
            product_id: item.product_id,
            previous_quantity: currentQty,
            new_quantity: newQty,
            change_amount: -item.quantity,
            change_type: "sale",
            notes: `Order #${selectedOrderId.slice(0, 8).toUpperCase()} - ${item.product_name}`,
            order_id: selectedOrderId,
            created_by: confirmedBy,
          });

        if (historyError) {
          console.error(`Failed to record stock history:`, historyError);
        }
      }

      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          payment_status: "confirmed",
          status: "confirmed",
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq("id", selectedOrderId);

      if (orderError) throw orderError;

      // Add income transaction
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          type: "income",
          category: "Product Sales",
          amount: order.total_amount,
          description: `Order #${selectedOrderId.slice(0, 8).toUpperCase()}`,
          order_id: selectedOrderId,
        });

      if (txError) console.error("Failed to create transaction:", txError);

      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Payment Confirmed! 🎉",
        message: `Your payment of ${formatMVR(order.total_amount)} has been confirmed. Your order is now being processed.`,
        type: "success",
        link: "/profile",
      });

      // Send confirmation email to customer
      sendOrderEmail(selectedOrderId, "payment_confirmed");

      toast({
        title: "Payment Confirmed",
        description: "Order confirmed, stock deducted, and customer notified.",
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setConfirmDialogOpen(false);
    setSelectedOrderId(null);
  };

  const handleRejectPayment = async () => {
    if (!selectedOrderId) return;

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "rejected",
          status: "cancelled",
        })
        .eq("id", selectedOrderId);

      if (error) throw error;

      // Notify user
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Payment Issue",
        message: "There was an issue with your payment. Please contact support or try again.",
        type: "error",
        link: "/support",
      });

      toast({
        title: "Payment Rejected",
        description: "Order has been cancelled and customer has been notified.",
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setRejectDialogOpen(false);
    setSelectedOrderId(null);
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { bg: "bg-gold/20", text: "text-gold", icon: Clock, label: "Pending" };
      case "uploaded":
        return { bg: "bg-cyan/20", text: "text-cyan", icon: Receipt, label: "Receipt Uploaded" };
      case "confirmed":
        return { bg: "bg-mint/20", text: "text-mint", icon: CheckCircle, label: "Confirmed" };
      case "rejected":
        return { bg: "bg-coral/20", text: "text-coral", icon: XCircle, label: "Rejected" };
      default:
        return { bg: "bg-muted", text: "text-muted-foreground", icon: AlertCircle, label: status };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingPayments = orders.filter(o => o.payment_status === "uploaded" || o.payment_status === "pending");
  const otherOrders = orders.filter(o => o.payment_status !== "uploaded" && o.payment_status !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending Payments requiring action */}
      {pendingPayments.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-gold" />
            Pending Payments ({pendingPayments.length})
          </h3>
          <div className="space-y-3">
            {pendingPayments.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isExpanded={expandedOrder === order.id}
                items={orderItems[order.id] || []}
                onToggle={() => handleToggleExpand(order.id)}
                onConfirm={() => {
                  setSelectedOrderId(order.id);
                  setConfirmDialogOpen(true);
                }}
                onReject={() => {
                  setSelectedOrderId(order.id);
                  setRejectDialogOpen(true);
                }}
                onViewReceipt={(url) => setViewingReceipt(url)}
                getPaymentStatusConfig={getPaymentStatusConfig}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other orders */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">All Orders ({orders.length})</h3>
        <div className="space-y-3">
          {otherOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={expandedOrder === order.id}
              items={orderItems[order.id] || []}
              onToggle={() => handleToggleExpand(order.id)}
              getPaymentStatusConfig={getPaymentStatusConfig}
            />
          ))}
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No orders yet</p>
        </div>
      )}

      {/* Receipt viewer modal */}
      {viewingReceipt && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingReceipt(null)}
        >
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Payment Receipt</h4>
              <button onClick={() => setViewingReceipt(null)} className="text-muted-foreground">
                ✕
              </button>
            </div>
            <img src={viewingReceipt} alt="Receipt" className="w-full rounded-xl" />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Confirm Payment?"
        description="This will mark the payment as confirmed, update the order status, and notify the customer."
        confirmText="Confirm Payment"
        variant="success"
        onConfirm={handleConfirmPayment}
      />

      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Reject Payment?"
        description="This will reject the payment and cancel the order. The customer will be notified."
        confirmText="Reject Payment"
        variant="destructive"
        onConfirm={handleRejectPayment}
      />
    </div>
  );
};

const OrderCard = ({
  order,
  isExpanded,
  items,
  onToggle,
  onConfirm,
  onReject,
  onViewReceipt,
  getPaymentStatusConfig,
}: {
  order: Order;
  isExpanded: boolean;
  items: OrderItem[];
  onToggle: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onViewReceipt?: (url: string) => void;
  getPaymentStatusConfig: (status: string) => any;
}) => {
  const statusConfig = getPaymentStatusConfig(order.payment_status || "pending");
  const StatusIcon = statusConfig.icon;

  return (
    <div className="glass-card rounded-2xl shadow-soft overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className={`w-10 h-10 rounded-full ${statusConfig.bg} flex items-center justify-center`}>
          <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-foreground">{formatMVR(order.total_amount)}</p>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border px-4 pb-4">
          <div className="mt-3 space-y-3">
            {/* Order items */}
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Items</h5>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.product_name} x{item.quantity}</span>
                  <span className="font-medium">{formatMVR(item.product_price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Contact info */}
            {order.shipping_address && (
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Address</h5>
                <p className="text-sm">{order.shipping_address}</p>
              </div>
            )}
            {order.phone && (
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Phone</h5>
                <p className="text-sm">{order.phone}</p>
              </div>
            )}

            {/* Receipt */}
            {order.receipt_url && onViewReceipt && (
              <button
                onClick={() => onViewReceipt(order.receipt_url!)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">View Receipt</span>
              </button>
            )}

            {/* Action buttons for pending payments */}
            {(order.payment_status === "uploaded" || order.payment_status === "pending") && onConfirm && onReject && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onConfirm}
                  className="flex-1 py-2 rounded-xl bg-mint text-white font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm
                </button>
                <button
                  onClick={onReject}
                  className="flex-1 py-2 rounded-xl bg-coral text-white font-medium flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentOrdersTab;
