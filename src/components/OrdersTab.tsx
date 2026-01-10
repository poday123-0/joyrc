import { useState, useEffect } from "react";
import { Package, Truck, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Upload, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  shipping_address: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  payment_status: string | null;
  payment_method: string | null;
  receipt_url: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

interface OrdersTabProps {
  isAdmin?: boolean;
}

const paymentStatusColors: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: "bg-gold/20", text: "text-gold", icon: Clock, label: "Awaiting Payment" },
  uploaded: { bg: "bg-cyan-light/50", text: "text-teal", icon: Upload, label: "Receipt Uploaded" },
  confirmed: { bg: "bg-primary/20", text: "text-primary", icon: CheckCircle2, label: "Payment Confirmed" },
  rejected: { bg: "bg-coral/20", text: "text-coral", icon: XCircle, label: "Payment Rejected" },
};

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { bg: "bg-gold/20", text: "text-gold", icon: Clock },
  processing: { bg: "bg-cyan-light/50", text: "text-teal", icon: Package },
  shipped: { bg: "bg-mint/30", text: "text-primary", icon: Truck },
  delivered: { bg: "bg-primary/20", text: "text-primary", icon: CheckCircle },
  cancelled: { bg: "bg-coral/20", text: "text-coral", icon: XCircle },
};

const OrdersTab = ({ isAdmin = false }: OrdersTabProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setOrders(data || []);
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

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({ 
        title: "Update Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Order Status Updated",
        description: `Order has been marked as ${newStatus}.`,
      });
      fetchOrders();
    }
  };

  const handleReceiptUpload = async (orderId: string, file: File) => {
    setUploading(orderId);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `receipts/${orderId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          receipt_url: publicUrl.publicUrl,
          payment_status: "uploaded"
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      toast({ 
        title: "Receipt Uploaded",
        description: "Your payment receipt has been uploaded. Awaiting confirmation.",
      });
      fetchOrders();
    } catch (error: any) {
      toast({ 
        title: "Upload Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">No orders yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "Orders will appear here when customers place them." : "Start shopping to place your first order!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const statusConfig = statusColors[order.status] || statusColors.pending;
        const StatusIcon = statusConfig.icon;
        const paymentConfig = paymentStatusColors[order.payment_status || "pending"] || paymentStatusColors.pending;
        const PaymentIcon = paymentConfig.icon;
        const isExpanded = expandedOrder === order.id;
        const items = orderItems[order.id] || [];
        const canUploadReceipt = !isAdmin && order.payment_method === "bank_transfer" && 
          (order.payment_status === "pending" || order.payment_status === "rejected");

        return (
          <div key={order.id} className="glass-card rounded-2xl shadow-soft overflow-hidden">
            {/* Order header */}
            <button
              onClick={() => handleToggleExpand(order.id)}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <div className={`w-10 h-10 rounded-full ${statusConfig.bg} flex items-center justify-center`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text} capitalize`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
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

            {/* Order details (expanded) */}
            {isExpanded && (
              <div className="border-t border-border px-4 pb-4">
                {/* Payment Status Section */}
                <div className="mt-3 p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Payment Status</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${paymentConfig.bg} flex items-center justify-center`}>
                      <PaymentIcon className={`w-4 h-4 ${paymentConfig.text}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${paymentConfig.text}`}>{paymentConfig.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {order.payment_method === "bank_transfer" ? "Bank Transfer" : order.payment_method || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Receipt Upload Section for Customers */}
                  {canUploadReceipt && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-gold mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          {order.payment_status === "rejected" 
                            ? "Your previous receipt was rejected. Please upload a new one."
                            : "Please upload your payment receipt to confirm your order."}
                        </p>
                      </div>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleReceiptUpload(order.id, file);
                          }}
                          className="hidden"
                          disabled={uploading === order.id}
                        />
                        <div className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-primary/30 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all ${uploading === order.id ? 'opacity-50 cursor-wait' : ''}`}>
                          {uploading === order.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm text-muted-foreground">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-primary" />
                              <span className="text-sm text-primary font-medium">Upload Receipt</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Show uploaded receipt */}
                  {order.receipt_url && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Receipt uploaded:</p>
                      <a 
                        href={order.receipt_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline hover:no-underline"
                      >
                        View Receipt
                      </a>
                    </div>
                  )}
                </div>

                {/* Order items */}
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Items</h4>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.product_name} <span className="text-muted-foreground">x{item.quantity}</span>
                        </span>
                        <span className="font-medium">{formatMVR(item.product_price * item.quantity)}</span>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-sm text-muted-foreground">Loading items...</p>
                    )}
                  </div>
                </div>

                {/* Shipping info */}
                {order.shipping_address && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Shipping Address</h4>
                    <p className="text-sm text-foreground">{order.shipping_address}</p>
                  </div>
                )}

                {order.phone && (
                  <div className="mt-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Phone</h4>
                    <p className="text-sm text-foreground">{order.phone}</p>
                  </div>
                )}

                {order.notes && (
                  <div className="mt-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</h4>
                    <p className="text-sm text-foreground">{order.notes}</p>
                  </div>
                )}

                {/* Admin status controls */}
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Update Status</h4>
                    <div className="flex flex-wrap gap-2">
                      {["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(order.id, status)}
                          disabled={order.status === status}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            order.status === status
                              ? `${statusColors[status].bg} ${statusColors[status].text}`
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrdersTab;
