import { useState, useEffect } from "react";
import { Package, Truck, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Upload, CreditCard, AlertCircle, CheckCircle2, User, Trash2, Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";

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
  assigned_to: string | null;
  assigned_at: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  color_id?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
}

interface StaffProfile {
  user_id: string;
  full_name: string | null;
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

const statusColors: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: "bg-gold/20", text: "text-gold", icon: Clock, label: "Pending" },
  processing: { bg: "bg-cyan-light/50", text: "text-teal", icon: Package, label: "Processing" },
  on_delivery: { bg: "bg-cyan-light/50", text: "text-teal", icon: Truck, label: "Out for Delivery" },
  shipped: { bg: "bg-mint/30", text: "text-primary", icon: Truck, label: "Shipped" },
  delivered: { bg: "bg-primary/20", text: "text-primary", icon: CheckCircle, label: "Delivered" },
  cancelled: { bg: "bg-coral/20", text: "text-coral", icon: XCircle, label: "Cancelled" },
};

const OrdersTab = ({ isAdmin = false }: OrdersTabProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [staffProfiles, setStaffProfiles] = useState<Record<string, string>>({});
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { user, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, isAdmin]);

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // When viewing from Profile page (isAdmin=false), only show current user's orders
    // When viewing from Admin dashboard (isAdmin=true), show all orders
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }
    
    const { data, error } = await query;

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setOrders(data || []);
      
      // Fetch staff profiles for assigned orders
      const assignedStaffIds = [...new Set(data?.filter(o => o.assigned_to).map(o => o.assigned_to) || [])];
      if (assignedStaffIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", assignedStaffIds);
        
        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => {
          profileMap[p.user_id] = p.full_name || "Staff Member";
        });
        setStaffProfiles(profileMap);
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

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

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
      return;
    }

    // Send notification to customer based on status change
    const notificationMessages: Record<string, { title: string; message: string; type: string }> = {
      processing: {
        title: "Order Processing 📦",
        message: `Your order #${orderId.slice(0, 8).toUpperCase()} is now being processed and will be shipped soon.`,
        type: "info",
      },
      shipped: {
        title: "Order Shipped! 🚚",
        message: `Great news! Your order #${orderId.slice(0, 8).toUpperCase()} has been shipped and is on its way to you.`,
        type: "success",
      },
      delivered: {
        title: "Order Delivered! 🎉",
        message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered. Enjoy your purchase!`,
        type: "success",
      },
      cancelled: {
        title: "Order Cancelled",
        message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been cancelled. Contact support if you have questions.`,
        type: "error",
      },
    };

    const notificationData = notificationMessages[newStatus];
    if (notificationData) {
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        link: "/profile",
      });

      // Also try to send email notification via edge function
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", order.user_id)
          .single();

        // Get user email from auth (we'll use the edge function for this)
        const emailType = newStatus === "shipped" ? "order_shipped" : 
                          newStatus === "delivered" ? "order_delivered" : null;
        
        if (emailType) {
          await supabase.functions.invoke("send-order-notification", {
            body: {
              orderId,
              type: emailType,
              customerName: profile?.full_name || "Customer",
            },
          });
        }
      } catch (emailError) {
        console.log("Email notification skipped:", emailError);
      }
    }

    toast({ 
      title: "Order Status Updated",
      description: `Order has been marked as ${newStatus}. Customer has been notified.`,
    });
    fetchOrders();
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

  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    
    if (!deletePassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm.",
        variant: "destructive",
      });
      return;
    }
    
    setDeleting(true);
    try {
      // Verify password by re-authenticating
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) throw new Error("User not found");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: deletePassword,
      });

      if (signInError) {
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
        setDeleting(false);
        return;
      }

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", deleteOrderId);

      if (error) throw error;

      toast({
        title: "Order Deleted",
        description: "The order and all associated data have been permanently removed.",
      });
      
      setOrders(prev => prev.filter(o => o.id !== deleteOrderId));
      setExpandedOrder(null);
      setDeleteOrderId(null);
      setDeletePassword("");
      setShowPassword(false);
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    setDeleteOrderId(null);
    setDeletePassword("");
    setShowPassword(false);
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
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          <div key={order.id} className={`glass-card rounded-2xl shadow-soft overflow-hidden ${isExpanded ? 'md:col-span-2 xl:col-span-3' : ''}`}>
            {/* Order header */}
            <button
              onClick={() => handleToggleExpand(order.id)}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <div className={`w-10 h-10 rounded-full ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
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
              <div className="text-right flex-shrink-0">
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
                <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                  {/* Payment Status Section */}
                  <div className="mt-3 p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Payment Status</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${paymentConfig.bg} flex items-center justify-center flex-shrink-0`}>
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
                          <AlertCircle className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
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
                    {/* Delivery Assignment Info for Customers */}
                    {!isAdmin && order.assigned_to && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Delivery Assignment</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Truck className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {staffProfiles[order.assigned_to] || "Delivery Staff"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Assigned {order.assigned_at ? new Date(order.assigned_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }) : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                  <div className="mt-3 md:mt-0 p-3 rounded-xl bg-muted/30">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Items</h4>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground">
                              {item.product_name} <span className="text-muted-foreground">x{item.quantity}</span>
                            </span>
                            {item.color_name && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div 
                                  className="w-3 h-3 rounded-full border border-border"
                                  style={{ backgroundColor: item.color_hex || '#ccc' }}
                                />
                                <span className="text-xs text-muted-foreground">{item.color_name}</span>
                              </div>
                            )}
                          </div>
                          <span className="font-medium flex-shrink-0">{formatMVR(item.product_price * item.quantity)}</span>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="text-sm text-muted-foreground">Loading items...</p>
                      )}
                    </div>
                  </div>

                  {/* Shipping & Contact info */}
                  <div className="mt-3 md:mt-0 p-3 rounded-xl bg-muted/30">
                    {order.shipping_address && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Shipping Address</h4>
                        <p className="text-sm text-foreground">{order.shipping_address}</p>
                      </div>
                    )}

                    {order.phone && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Phone</h4>
                        <p className="text-sm text-foreground">{order.phone}</p>
                      </div>
                    )}

                    {order.notes && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</h4>
                        <p className="text-sm text-foreground">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin status controls */}
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Update Status</h4>
                      {isSuperAdmin && (
                        <button
                          onClick={() => setDeleteOrderId(order.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Order
                        </button>
                      )}
                    </div>
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

      {/* Delete Order Password Dialog */}
      {deleteOrderId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-elevated border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Delete Order</h3>
                <p className="text-sm text-muted-foreground">Order #{deleteOrderId.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete the order and all associated transactions and order items. This action cannot be undone.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Enter your password to confirm
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-10 pr-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && deletePassword.trim()) {
                        handleDeleteOrder();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeDeleteDialog}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrder}
                  disabled={deleting || !deletePassword.trim()}
                  className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
