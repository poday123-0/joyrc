import { useState, useEffect, useRef } from "react";
import { 
  Clock, CheckCircle, XCircle, Receipt, Eye, 
  ChevronDown, ChevronUp, CreditCard, AlertCircle,
  Trash2, Edit, Download, Upload, FileSpreadsheet,
  Truck, UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  notes: string | null;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
}

interface DeliveryStaff {
  user_id: string;
  full_name: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

interface ImportOrder {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  order_date: string;
  notes?: string;
}

const PaymentOrdersTab = () => {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  
  // Edit state
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editNotes, setEditNotes] = useState("");
  
  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delivery assignment state
  const [deliveryStaff, setDeliveryStaff] = useState<DeliveryStaff[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, { full_name: string | null }>>({});

  useEffect(() => {
    fetchOrders();
    fetchDeliveryStaff();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
      
      // Fetch customer profiles for all orders
      const userIds = [...new Set(data.map(o => o.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        if (profiles) {
          const profileMap: Record<string, { full_name: string | null }> = {};
          profiles.forEach(p => {
            profileMap[p.user_id] = { full_name: p.full_name };
          });
          setCustomerProfiles(profileMap);
        }
      }
    }
    setLoading(false);
  };

  const fetchDeliveryStaff = async () => {
    // Fetch staff with delivery permission
    const { data: permissions, error: permError } = await supabase
      .from("staff_permissions")
      .select("user_id")
      .eq("permission_key", "delivery");
    
    if (permError || !permissions?.length) {
      // If no delivery staff, fetch all admins as fallback
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "super_admin"]);
      
      if (adminRoles?.length) {
        const userIds = adminRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        if (profiles) {
          setDeliveryStaff(profiles.map(p => ({ user_id: p.user_id, full_name: p.full_name })));
        }
      }
      return;
    }
    
    const userIds = permissions.map(p => p.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    
    if (profiles) {
      setDeliveryStaff(profiles.map(p => ({ user_id: p.user_id, full_name: p.full_name })));
    }
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
      const { data: { user } } = await supabase.auth.getUser();
      const confirmedBy = user?.id || null;

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, product_name, quantity")
        .eq("order_id", selectedOrderId);

      if (itemsError) throw itemsError;

      for (const item of items || []) {
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

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          payment_status: "confirmed",
          status: "confirmed",
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq("id", selectedOrderId);

      if (orderError) throw orderError;

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

      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Payment Confirmed! 🎉",
        message: `Your payment of ${formatMVR(order.total_amount)} has been confirmed. Your order is now being processed.`,
        type: "success",
        link: "/profile",
      });

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

  const handleDeleteOrder = async () => {
    if (!selectedOrderId || !isSuperAdmin) return;

    try {
      // Delete related transactions first
      const { error: txError } = await supabase
        .from("transactions")
        .delete()
        .eq("order_id", selectedOrderId);

      if (txError) {
        console.error("Failed to delete transactions:", txError);
      }

      // Delete related stock history records
      const { error: stockError } = await supabase
        .from("stock_history")
        .delete()
        .eq("order_id", selectedOrderId);

      if (stockError) {
        console.error("Failed to delete stock history:", stockError);
      }

      // Delete order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", selectedOrderId);

      if (itemsError) throw itemsError;

      // Finally delete the order
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", selectedOrderId);

      if (error) throw error;

      toast({
        title: "Order Deleted",
        description: "Order and all related transactions have been permanently deleted.",
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setDeleteDialogOpen(false);
    setSelectedOrderId(null);
  };

  const handleAssignDelivery = async () => {
    if (!selectedOrderId || !selectedStaffId) return;

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          assigned_to: selectedStaffId,
          assigned_at: new Date().toISOString(),
          status: "on_delivery",
        })
        .eq("id", selectedOrderId);

      if (error) throw error;

      // Get staff name for notifications
      const assignedStaff = deliveryStaff.find(s => s.user_id === selectedStaffId);
      const staffName = assignedStaff?.full_name || "Delivery Staff";

      // Notify the assigned staff member
      await supabase.from("notifications").insert({
        user_id: selectedStaffId,
        title: "New Delivery Assigned 🚚",
        message: `Order #${selectedOrderId.slice(0, 8).toUpperCase()} has been assigned to you for delivery.`,
        type: "info",
        link: "/admin",
      });

      // Notify the customer
      const customerName = customerProfiles[order.user_id]?.full_name || "Customer";
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Order Out for Delivery! 🚚",
        message: `Great news! Your order #${selectedOrderId.slice(0, 8).toUpperCase()} is now out for delivery.`,
        type: "success",
        link: "/profile",
      });

      // Send emails to staff and customer
      try {
        await supabase.functions.invoke("send-order-notification", {
          body: {
            orderId: selectedOrderId,
            type: "delivery_assigned",
            staffUserId: selectedStaffId,
            staffName,
            customerUserId: order.user_id,
            customerName,
          },
        });
      } catch (emailError) {
        console.log("Email notification skipped:", emailError);
      }

      toast({
        title: "Delivery Assigned",
        description: `Order assigned to ${staffName}. Both staff and customer have been notified.`,
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setAssignDialogOpen(false);
    setSelectedOrderId(null);
    setSelectedStaffId("");
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Send notification to customer based on status change
      const statusMessages: Record<string, { title: string; message: string; type: string }> = {
        on_delivery: {
          title: "Order Out for Delivery! 🚚",
          message: `Your order #${orderId.slice(0, 8).toUpperCase()} is now out for delivery.`,
          type: "success",
        },
        delivered: {
          title: "Order Delivered! 📦",
          message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered. Enjoy!`,
          type: "success",
        },
        shipped: {
          title: "Order Shipped! 🚚",
          message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been shipped and is on its way.`,
          type: "success",
        },
      };

      const notification = statusMessages[newStatus];
      if (notification) {
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: "/profile",
        });

        // Send email notification
        const customerName = customerProfiles[order.user_id]?.full_name || "Customer";
        const emailType = newStatus === "delivered" ? "order_delivered" : 
                          newStatus === "shipped" ? "order_shipped" : null;
        
        if (emailType) {
          try {
            await supabase.functions.invoke("send-order-notification", {
              body: {
                orderId,
                type: emailType,
                customerUserId: order.user_id,
                customerName,
              },
            });
          } catch (emailError) {
            console.log("Email notification skipped:", emailError);
          }
        }
      }

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus}. Customer notified.`,
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setEditNotes(order.notes || "");
    setEditComment("");
  };

  const handleSaveEdit = async () => {
    if (!editingOrderId) return;

    try {
      const timestamp = new Date().toISOString();
      const currentNotes = orders.find(o => o.id === editingOrderId)?.notes || "";
      const newNotes = `${currentNotes}\n\n[${timestamp}] Edit by admin: ${editComment}\nUpdated notes: ${editNotes}`.trim();

      const { error } = await supabase
        .from("orders")
        .update({ notes: newNotes })
        .eq("id", editingOrderId);

      if (error) throw error;

      toast({
        title: "Order Updated",
        description: "Order notes have been updated with your comment.",
      });

      setEditingOrderId(null);
      setEditComment("");
      setEditNotes("");
      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "order_number",
      "customer_name", 
      "customer_phone",
      "shipping_address",
      "product_name",
      "quantity",
      "unit_price",
      "order_date",
      "notes"
    ];
    
    const sampleData = [
      "ORD-001",
      "Ahmed Ali",
      "+960 7123456",
      "Male, Maldives",
      "RC Monster Truck",
      "2",
      "1500",
      "2025-01-15",
      "Old system order"
    ];

    const csvContent = [
      headers.join(","),
      sampleData.join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "order_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateOrderNumber = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      const importedOrders: ImportOrder[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const order: ImportOrder = {
          order_number: values[headers.indexOf("order_number")] || generateOrderNumber(),
          customer_name: values[headers.indexOf("customer_name")] || "Unknown",
          customer_phone: values[headers.indexOf("customer_phone")] || "",
          shipping_address: values[headers.indexOf("shipping_address")] || "",
          product_name: values[headers.indexOf("product_name")] || "Imported Product",
          quantity: parseInt(values[headers.indexOf("quantity")]) || 1,
          unit_price: parseFloat(values[headers.indexOf("unit_price")]) || 0,
          order_date: values[headers.indexOf("order_date")] || new Date().toISOString(),
          notes: values[headers.indexOf("notes")] || "Imported from CSV",
        };
        importedOrders.push(order);
      }

      // Group by order number
      const groupedOrders = importedOrders.reduce((acc, item) => {
        if (!acc[item.order_number]) {
          acc[item.order_number] = {
            ...item,
            items: [{ name: item.product_name, quantity: item.quantity, price: item.unit_price }],
            total: item.quantity * item.unit_price
          };
        } else {
          acc[item.order_number].items.push({ name: item.product_name, quantity: item.quantity, price: item.unit_price });
          acc[item.order_number].total += item.quantity * item.unit_price;
        }
        return acc;
      }, {} as Record<string, any>);

      let importCount = 0;

      for (const [orderNum, orderData] of Object.entries(groupedOrders)) {
        // Create order with auto-generated ID
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user?.id, // Use current admin as owner for imported orders
            status: "delivered",
            payment_status: "confirmed",
            payment_method: "imported",
            total_amount: orderData.total,
            shipping_address: orderData.shipping_address,
            phone: orderData.customer_phone,
            notes: `[IMPORTED] Original Order: ${orderNum}\nCustomer: ${orderData.customer_name}\n${orderData.notes}`,
            created_at: new Date(orderData.order_date).toISOString(),
          })
          .select()
          .single();

        if (orderError) {
          console.error("Failed to import order:", orderError);
          continue;
        }

        // Create order items
        for (const item of orderData.items) {
          await supabase.from("order_items").insert({
            order_id: newOrder.id,
            product_id: newOrder.id, // Use order ID as placeholder since no product exists
            product_name: item.name,
            product_price: item.price,
            quantity: item.quantity,
          });
        }

        // Create transaction record
        await supabase.from("transactions").insert({
          type: "income",
          category: "Imported Sales",
          amount: orderData.total,
          description: `Imported Order: ${orderNum}`,
          order_id: newOrder.id,
        });

        importCount++;
      }

      toast({
        title: "Import Successful",
        description: `Successfully imported ${importCount} orders.`,
      });

      setShowImportDialog(false);
      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
      case "imported":
        return { bg: "bg-primary/20", text: "text-primary", icon: FileSpreadsheet, label: "Imported" };
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
      {/* Super Admin Actions */}
      {isSuperAdmin && (
        <div className="flex items-center gap-3 p-4 glass-card rounded-2xl">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <span className="text-sm text-foreground font-medium">Import Old Orders</span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
          <Button
            size="sm"
            onClick={() => setShowImportDialog(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImportDialog(false)}>
          <div className="bg-background rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">Import Orders from CSV</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a CSV file with your old orders. Order numbers will be auto-generated if not provided.
            </p>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {importing ? "Importing..." : "Click to upload CSV file"}
                  </p>
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowImportDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="outline" onClick={downloadTemplate} className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Get Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Payments requiring action */}
      {pendingPayments.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-gold" />
            Pending Payments ({pendingPayments.length})
          </h3>
          <div className="space-y-3">
            {pendingPayments.map((order) => {
              const assignedStaff = deliveryStaff.find(s => s.user_id === order.assigned_to);
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  isExpanded={expandedOrder === order.id}
                  items={orderItems[order.id] || []}
                  isSuperAdmin={isSuperAdmin}
                  isAdmin={isAdmin}
                  isEditing={editingOrderId === order.id}
                  editNotes={editNotes}
                  editComment={editComment}
                  onToggle={() => handleToggleExpand(order.id)}
                  onConfirm={() => {
                    setSelectedOrderId(order.id);
                    setConfirmDialogOpen(true);
                  }}
                  onReject={() => {
                    setSelectedOrderId(order.id);
                    setRejectDialogOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedOrderId(order.id);
                    setDeleteDialogOpen(true);
                  }}
                  onEdit={() => handleEditOrder(order)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => {
                    setEditingOrderId(null);
                    setEditComment("");
                    setEditNotes("");
                  }}
                  onEditNotesChange={setEditNotes}
                  onEditCommentChange={setEditComment}
                  onViewReceipt={(url) => setViewingReceipt(url)}
                  onAssignDelivery={() => {
                    setSelectedOrderId(order.id);
                    setAssignDialogOpen(true);
                  }}
                  onUpdateStatus={(status) => handleUpdateOrderStatus(order.id, status)}
                  deliveryStaff={deliveryStaff}
                  assignedStaffName={assignedStaff?.full_name || undefined}
                  getPaymentStatusConfig={getPaymentStatusConfig}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Other orders */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">All Orders ({orders.length})</h3>
        <div className="space-y-3">
          {otherOrders.map((order) => {
            const assignedStaff = deliveryStaff.find(s => s.user_id === order.assigned_to);
            return (
              <OrderCard
                key={order.id}
                order={order}
                isExpanded={expandedOrder === order.id}
                items={orderItems[order.id] || []}
                isSuperAdmin={isSuperAdmin}
                isAdmin={isAdmin}
                isEditing={editingOrderId === order.id}
                editNotes={editNotes}
                editComment={editComment}
                onToggle={() => handleToggleExpand(order.id)}
                onDelete={() => {
                  setSelectedOrderId(order.id);
                  setDeleteDialogOpen(true);
                }}
                onEdit={() => handleEditOrder(order)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => {
                  setEditingOrderId(null);
                  setEditComment("");
                  setEditNotes("");
                }}
                onEditNotesChange={setEditNotes}
                onEditCommentChange={setEditComment}
                onAssignDelivery={() => {
                  setSelectedOrderId(order.id);
                  setAssignDialogOpen(true);
                }}
                onUpdateStatus={(status) => handleUpdateOrderStatus(order.id, status)}
                deliveryStaff={deliveryStaff}
                assignedStaffName={assignedStaff?.full_name || undefined}
                getPaymentStatusConfig={getPaymentStatusConfig}
              />
            );
          })}
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Order?"
        description="This will permanently delete this order and all its items. This action cannot be undone."
        confirmText="Delete Order"
        variant="destructive"
        onConfirm={handleDeleteOrder}
      />

      {/* Assign Delivery Dialog */}
      {assignDialogOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setAssignDialogOpen(false);
            setSelectedStaffId("");
          }}
        >
          <div 
            className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Assign to Delivery
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Select a staff member to deliver this order. They will be notified via email and in-app notification.
            </p>
            
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select delivery staff..." />
              </SelectTrigger>
              <SelectContent>
                {deliveryStaff.map((staff) => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staff.full_name || "Unknown Staff"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {deliveryStaff.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No delivery staff available. Add staff with "delivery" permission first.
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleAssignDelivery}
                disabled={!selectedStaffId}
                className="flex-1 gap-2"
              >
                <Truck className="w-4 h-4" />
                Assign & Notify
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setAssignDialogOpen(false);
                  setSelectedStaffId("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrderCard = ({
  order,
  isExpanded,
  items,
  isSuperAdmin,
  isAdmin,
  isEditing,
  editNotes,
  editComment,
  onToggle,
  onConfirm,
  onReject,
  onDelete,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNotesChange,
  onEditCommentChange,
  onViewReceipt,
  onAssignDelivery,
  onUpdateStatus,
  deliveryStaff,
  assignedStaffName,
  getPaymentStatusConfig,
}: {
  order: Order;
  isExpanded: boolean;
  items: OrderItem[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEditing: boolean;
  editNotes: string;
  editComment: string;
  onToggle: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onEditNotesChange?: (value: string) => void;
  onEditCommentChange?: (value: string) => void;
  onViewReceipt?: (url: string) => void;
  onAssignDelivery?: () => void;
  onUpdateStatus?: (status: string) => void;
  deliveryStaff?: DeliveryStaff[];
  assignedStaffName?: string;
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

            {/* Notes */}
            {order.notes && !isEditing && (
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</h5>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            {/* Edit form */}
            {isEditing && onEditNotesChange && onEditCommentChange && onSaveEdit && onCancelEdit && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
                <div>
                  <Label htmlFor="edit-comment" className="text-xs">Edit Comment (required)</Label>
                  <Input
                    id="edit-comment"
                    placeholder="Reason for editing..."
                    value={editComment}
                    onChange={(e) => onEditCommentChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes" className="text-xs">Order Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editNotes}
                    onChange={(e) => onEditNotesChange(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={onSaveEdit} disabled={!editComment.trim()}>
                    Save Changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelEdit}>
                    Cancel
                  </Button>
                </div>
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

            {/* Delivery Assignment - Show after payment confirmed */}
            {order.payment_status === "confirmed" && isAdmin && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Delivery Status</span>
                  </div>
                  {order.assigned_to && assignedStaffName && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      Assigned to: {assignedStaffName}
                    </span>
                  )}
                </div>
                
                {/* Assign to delivery button */}
                {!order.assigned_to && onAssignDelivery && (
                  <Button
                    size="sm"
                    onClick={onAssignDelivery}
                    className="w-full gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign to Delivery Staff
                  </Button>
                )}

                {/* Status update buttons */}
                {onUpdateStatus && (
                  <div className="flex flex-wrap gap-2">
                    {["on_delivery", "shipped", "delivered"].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={order.status === status ? "default" : "outline"}
                        onClick={() => onUpdateStatus(status)}
                        disabled={order.status === status}
                        className="gap-1"
                      >
                        {status === "on_delivery" && <Truck className="w-3 h-3" />}
                        {status === "shipped" && <Truck className="w-3 h-3" />}
                        {status === "delivered" && <CheckCircle className="w-3 h-3" />}
                        {status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Admin actions */}
            {!isEditing && (
              <div className="flex gap-2 pt-2 border-t border-border">
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onEdit}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit with Comment
                  </Button>
                )}
                {isSuperAdmin && onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDelete}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentOrdersTab;
