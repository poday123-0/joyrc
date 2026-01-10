import { useState, useEffect } from "react";
import { Package, Eye, Truck, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  shipping_address: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
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
        const isExpanded = expandedOrder === order.id;
        const items = orderItems[order.id] || [];

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
                <div className="flex items-center gap-2">
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
                <p className="font-bold text-foreground">${order.total_amount.toFixed(2)}</p>
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
                {/* Order items */}
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Items</h4>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.product_name} <span className="text-muted-foreground">x{item.quantity}</span>
                        </span>
                        <span className="font-medium">${(item.product_price * item.quantity).toFixed(2)}</span>
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
