import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { 
  Package, Truck, CheckCircle, MapPin, Phone, 
  ChevronDown, ChevronUp, User, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DataFilterBar, useDataFilter } from "@/components/DataFilterBar";

interface Order {
  id: string;
  order_number: string | null;
  user_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  shipping_address: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
}

const getOrderNum = (order: { order_number?: string | null; id: string }) =>
  order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

interface CustomerProfile {
  full_name: string | null;
}

const DeliveryTab = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, CustomerProfile>>({});
  const [confirmDeliverDialog, setConfirmDeliverDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAssignedOrders();
    }
  }, [user]);

  useRealtimeSubscription('orders', () => { if (user) fetchAssignedOrders(); }, 'rt-delivery');

  const fetchAssignedOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch orders assigned to current user that are on delivery
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("assigned_to", user.id)
      .in("status", ["on_delivery", "shipped"])
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching assigned orders:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setOrders(data || []);
      
      // Fetch customer profiles for all orders
      const userIds = [...new Set((data || []).map(o => o.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        if (profiles) {
          const profileMap: Record<string, CustomerProfile> = {};
          profiles.forEach(p => {
            profileMap[p.user_id] = { full_name: p.full_name };
          });
          setCustomerProfiles(profileMap);
        }
      }
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

  const handleMarkDelivered = async () => {
    if (!selectedOrderId || !user) return;

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", selectedOrderId);

      if (error) throw error;

      // Send notification to customer
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Order Delivered! 📦",
        message: `Your order #${selectedOrderId.slice(0, 8).toUpperCase()} has been delivered. Thank you for shopping with us!`,
        type: "success",
        link: "/profile",
      });

      // Get customer email for notification
      const { data: customerData } = await supabase.auth.admin.getUserById(order.user_id);
      const customerEmail = customerData?.user?.email;
      const customerName = customerProfiles[order.user_id]?.full_name || "Customer";

      if (customerEmail) {
        try {
          await supabase.functions.invoke("send-order-notification", {
            body: {
              orderId: selectedOrderId,
              type: "order_delivered",
              customerEmail,
              customerName,
            },
          });
        } catch (emailError) {
          console.log("Email notification skipped:", emailError);
        }
      }

      toast({
        title: "Order Marked as Delivered",
        description: "Customer has been notified.",
      });

      fetchAssignedOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setConfirmDeliverDialog(false);
    setSelectedOrderId(null);
  };

  const { filters, setFilters, filteredData: filteredOrders } = useDataFilter(
    orders,
    (o) => o.created_at,
    (o) => `${o.id} ${o.shipping_address || ""} ${o.phone || ""} ${o.notes || ""} ${customerProfiles[o.user_id]?.full_name || ""}`,
    (o) => o.status,
  );

  const deliveryStatusOptions = [
    { value: "all", label: "All Status" },
    { value: "on_delivery", label: "On Delivery", color: "bg-cyan-light/50 text-teal" },
    { value: "shipped", label: "Shipped", color: "bg-mint/30 text-primary" },
  ];

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
          <Truck className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">No deliveries assigned</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Orders assigned to you for delivery will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DataFilterBar
        searchPlaceholder="Search by order ID, customer, address..."
        statusOptions={deliveryStatusOptions}
        statusLabel="Delivery Status"
        onFiltersChange={setFilters}
      />

      <div className="flex items-center justify-end mb-4">
        <span className="text-sm text-muted-foreground">{filteredOrders.length} deliveries</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredOrders.map((order) => {
          const isExpanded = expandedOrder === order.id;
          const items = orderItems[order.id] || [];
          const customer = customerProfiles[order.user_id];

          return (
            <div key={order.id} className={`glass-card rounded-2xl shadow-soft overflow-hidden ${isExpanded ? 'md:col-span-2 xl:col-span-3' : ''}`}>
              <button
                onClick={() => handleToggleExpand(order.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary capitalize">
                      {order.status === "on_delivery" ? "On Delivery" : order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <User className="w-3 h-3" />
                    <span>{customer?.full_name || "Customer"}</span>
                  </div>
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
                    {/* Assigned time */}
                    {order.assigned_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Assigned: {new Date(order.assigned_at).toLocaleString()}</span>
                      </div>
                    )}

                    {/* Order items */}
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Items</h5>
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.product_name} x{item.quantity}</span>
                          <span className="font-medium">{formatMVR(item.product_price * item.quantity)}</span>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="text-sm text-muted-foreground">Loading items...</p>
                      )}
                    </div>

                    {/* Delivery address */}
                    {order.shipping_address && (
                      <div className="p-3 rounded-xl bg-muted/30">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Delivery Address</h5>
                            <p className="text-sm font-medium">{order.shipping_address}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phone */}
                    {order.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${order.phone}`} className="text-sm text-primary underline">
                          {order.phone}
                        </a>
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</h5>
                        <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                      </div>
                    )}

                    {/* Mark as Delivered button */}
                    {order.status !== "delivered" && (
                      <Button
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setConfirmDeliverDialog(true);
                        }}
                        className="w-full gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Delivered
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmDeliverDialog}
        onOpenChange={setConfirmDeliverDialog}
        title="Confirm Delivery"
        description="Are you sure this order has been delivered to the customer?"
        onConfirm={handleMarkDelivered}
        confirmText="Yes, Mark Delivered"
      />
    </div>
  );
};

export default DeliveryTab;
