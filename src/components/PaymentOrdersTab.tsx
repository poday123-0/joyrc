import { useState, useEffect, useRef, useMemo } from "react";
import { DataFilterBar, useDataFilter } from "@/components/DataFilterBar";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { 
  Clock, CheckCircle, XCircle, Receipt, Eye, 
  ChevronDown, ChevronUp, CreditCard, AlertCircle,
  Trash2, Edit, Download, Upload, FileSpreadsheet,
  Truck, UserPlus, Plus, FileText, RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import POSInvoice from "@/components/POSInvoice";
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
import AddOrderDialog from "@/components/AddOrderDialog";

interface Order {
  id: string;
  order_number: string | null;
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
  confirmed_by: string | null;
  payment_reference: string | null;
  payment_bank_id: string | null;
  payment_card_type_id: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  subtotal?: number | null;
}

const getOrderNum = (order: { order_number?: string | null; id: string }) =>
  order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;

interface DeliveryStaff {
  user_id: string;
  full_name: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  color_name?: string | null;
  color_hex?: string | null;
  product_id: string;
  item_code?: string | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  line_total?: number | null;
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
  const [editOrderNumber, setEditOrderNumber] = useState("");
  const [editOrderDate, setEditOrderDate] = useState("");
  
  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delivery assignment state
  const [deliveryStaff, setDeliveryStaff] = useState<DeliveryStaff[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, { full_name: string | null }>>({});
  const [confirmerProfiles, setConfirmerProfiles] = useState<Record<string, { full_name: string | null }>>({});
  
  // Add order dialog state
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  
  // Return state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  
  // Invoice state
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{
    orderId: string;
    orderNumber?: string;
    orderDate: string;
    items: {
      name: string;
      quantity: number;
      price: number;
      color?: string | null;
      tax_rate?: number;
      tax_amount?: number;
      discount_amount?: number;
    }[];
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    total: number;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    isDelivery: boolean;
    notes?: string;
  } | null>(null);

  // Payment lookup state
  const [bankNames, setBankNames] = useState<Record<string, string>>({});
  const [cardTypeNames, setCardTypeNames] = useState<Record<string, string>>({});

  const normalizeOrderItems = (items: any[] = []): OrderItem[] =>
    items.map((item: any) => ({
      ...item,
      item_code: item.products?.item_code || null,
    }));

  useEffect(() => {
    fetchOrders();
    fetchDeliveryStaff();
    fetchPaymentLookups();
  }, []);

  const fetchPaymentLookups = async () => {
    const [{ data: banks }, { data: cards }] = await Promise.all([
      supabase.from("bank_settings").select("id, bank_name"),
      supabase.from("card_types").select("id, name"),
    ]);
    if (banks) setBankNames(Object.fromEntries(banks.map(b => [b.id, b.bank_name])));
    if (cards) setCardTypeNames(Object.fromEntries(cards.map(c => [c.id, c.name])));
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);

      const orderIds = data.map((order) => order.id);
      if (orderIds.length > 0) {
        const { data: prefetchedItems } = await supabase
          .from("order_items")
          .select("*, products:product_id(item_code)")
          .in("order_id", orderIds);

        if (prefetchedItems) {
          const grouped: Record<string, OrderItem[]> = {};
          normalizeOrderItems(prefetchedItems).forEach((item) => {
            if (!grouped[item.order_id]) grouped[item.order_id] = [];
            grouped[item.order_id].push(item);
          });
          setOrderItems(grouped);
        }
      } else {
        setOrderItems({});
      }
      
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
      
      // Fetch confirmer profiles (admins who approved orders)
      const confirmerIds = [...new Set(data.filter(o => o.confirmed_by).map(o => o.confirmed_by!))];
      if (confirmerIds.length > 0) {
        const { data: confirmerProfilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", confirmerIds);
        
        if (confirmerProfilesData) {
          const confirmerMap: Record<string, { full_name: string | null }> = {};
          confirmerProfilesData.forEach(p => {
            confirmerMap[p.user_id] = { full_name: p.full_name };
          });
          setConfirmerProfiles(confirmerMap);
        }
      }
    }
    setLoading(false);
  };

  useRealtimeSubscription(['orders', 'order_items'], fetchOrders, 'rt-payment-orders');

  const fetchDeliveryStaff = async () => {
    const { data: permissions, error: permError } = await supabase
      .from("staff_permissions")
      .select("user_id")
      .eq("permission_key", "tab_deliveries");

    if (permError) {
      console.error("Error fetching delivery staff permissions:", permError);
    }

    const staffIds = permissions?.map((permission) => permission.user_id) || [];

    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "super_admin"]);

    if (adminError) {
      console.error("Error fetching admin delivery staff:", adminError);
    }

    const adminIds = adminRoles?.map((role) => role.user_id) || [];
    const userIds = Array.from(new Set([...staffIds, ...adminIds]));

    if (userIds.length === 0) {
      setDeliveryStaff([]);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching delivery staff profiles:", profilesError);
      setDeliveryStaff([]);
      return;
    }

    setDeliveryStaff(
      (profiles || []).map((profile) => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
      })),
    );
  };

  const fetchOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) return;

    const { data, error } = await supabase
      .from("order_items")
      .select("*, products:product_id(item_code)")
      .eq("order_id", orderId);

    if (!error && data) {
      const mapped = normalizeOrderItems(data);
      setOrderItems((prev) => ({ ...prev, [orderId]: mapped }));
    }
  };

  const ensureOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) return orderItems[orderId];

    const { data, error } = await supabase
      .from("order_items")
      .select("*, products:product_id(item_code)")
      .eq("order_id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return [] as OrderItem[];
    }

    const mapped = normalizeOrderItems(data || []);
    setOrderItems((prev) => ({ ...prev, [orderId]: mapped }));
    return mapped;
  };

  const buildInvoiceData = async (order: Order) => {
    const items = await ensureOrderItems(order.id);
    const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.product_price || 0) * Number(item.quantity || 0), 0);
    const itemsDiscount = items.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0);
    const itemsTax = items.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0);

    return {
      orderId: order.id,
      orderNumber: order.order_number || undefined,
      orderDate: order.created_at,
      items: items.map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.product_price,
        color: item.color_name,
        tax_rate: Number(item.tax_rate || 0),
        tax_amount: Number(item.tax_amount || 0),
        discount_amount: Number(item.discount_amount || 0),
      })),
      subtotal: Number(order.subtotal || 0) > 0 ? Number(order.subtotal) : itemsSubtotal,
      discountAmount: Number(order.discount_amount || 0) > 0 ? Number(order.discount_amount) : itemsDiscount,
      taxAmount: Number(order.tax_amount || 0) > 0 ? Number(order.tax_amount) : itemsTax,
      discountType: (order.discount_type as "fixed" | "percent") || undefined,
      discountValue: order.discount_value != null ? Number(order.discount_value) : undefined,
      total: order.total_amount,
      customerName: customerProfiles[order.user_id]?.full_name || undefined,
      customerPhone: order.phone || undefined,
      customerAddress: order.shipping_address || undefined,
      isDelivery: !!order.shipping_address,
      notes: order.notes || undefined,
    };
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
        .select("product_id, product_name, quantity, color_id")
        .eq("order_id", selectedOrderId);

      if (itemsError) throw itemsError;

      // Aggregate total quantity per product to avoid overwrite bug
      const productTotalDeductions = new Map<string, number>();
      for (const item of items || []) {
        const current = productTotalDeductions.get(item.product_id) || 0;
        productTotalDeductions.set(item.product_id, current + item.quantity);
      }

      // Deduct from main product stock (once per product)
      const productStockMap = new Map<string, { prev: number; newQty: number; costPrice: number }>();
      for (const [productId, totalQty] of productTotalDeductions) {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("stock_quantity, cost_price")
          .eq("id", productId)
          .single();

        if (productError) {
          console.error(`Failed to get product ${productId}:`, productError);
          continue;
        }

        const currentQty = product.stock_quantity || 0;
        const newQty = Math.max(0, currentQty - totalQty);
        productStockMap.set(productId, { prev: currentQty, newQty, costPrice: Number(product.cost_price || 0) });

        const { error: updateError } = await supabase
          .from("products")
          .update({ 
            stock_quantity: newQty,
            in_stock: newQty > 0
          })
          .eq("id", productId);

        if (updateError) {
          console.error(`Failed to update stock for ${productId}:`, updateError);
        }
      }

      // Deduct from color-specific stock and create history per item
      for (const item of items || []) {
        if (item.color_id) {
          const { data: colorData } = await supabase
            .from("product_colors")
            .select("stock_quantity")
            .eq("id", item.color_id)
            .single();
          
          if (colorData) {
            const colorNewQty = Math.max(0, (colorData.stock_quantity || 0) - item.quantity);
            await supabase
              .from("product_colors")
              .update({ stock_quantity: colorNewQty })
              .eq("id", item.color_id);
          }
        }

        const stockInfo = productStockMap.get(item.product_id);
        const prevQty = stockInfo?.prev ?? 0;
        const newQty = stockInfo?.newQty ?? 0;
        const costPrice = stockInfo?.costPrice ?? 0;

        const { error: historyError } = await supabase
          .from("stock_history")
          .insert({
            product_id: item.product_id,
            previous_quantity: prevQty,
            new_quantity: newQty,
            change_amount: -item.quantity,
            change_type: "sale",
            notes: `Order ${order.order_number || selectedOrderId.slice(0, 8).toUpperCase()} - ${item.product_name}`,
            order_id: selectedOrderId,
            created_by: confirmedBy,
            unit_purchase_price: costPrice,
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
          confirmed_by: confirmedBy,
        })
        .eq("id", selectedOrderId);

      if (orderError) throw orderError;

      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          type: "income",
          category: "Product Sales",
          amount: order.total_amount,
          description: `Order ${order.order_number || selectedOrderId.slice(0, 8).toUpperCase()}`,
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
      // Check if the order was previously confirmed (has stock deductions and transactions)
      const wasConfirmed = order.payment_status === "confirmed";

      if (wasConfirmed) {
        // 1. Get stock history records and order items for this order to reverse stock deductions
        const [{ data: stockRecords, error: stockFetchError }, { data: orderItems }] = await Promise.all([
          supabase.from("stock_history").select("id, product_id, change_amount").eq("order_id", selectedOrderId),
          supabase.from("order_items").select("product_id, quantity, color_id").eq("order_id", selectedOrderId),
        ]);

        if (stockFetchError) {
          console.error("Failed to fetch stock history:", stockFetchError);
        }

        // 2. Restore stock for each product
        for (const record of stockRecords || []) {
          // change_amount is negative for sales, so we add the absolute value back
          const restoreAmount = Math.abs(record.change_amount);
          
          const { data: product, error: productError } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", record.product_id)
            .single();

          if (!productError && product) {
            const newQty = (product.stock_quantity || 0) + restoreAmount;
            await supabase
              .from("products")
              .update({ 
                stock_quantity: newQty,
                in_stock: newQty > 0 
              })
              .eq("id", record.product_id);
          }
        }

        // 2b. Restore color-specific stock
        for (const item of orderItems || []) {
          if (item.color_id) {
            const { data: colorData } = await supabase
              .from("product_colors")
              .select("stock_quantity")
              .eq("id", item.color_id)
              .single();
            
            if (colorData) {
              await supabase
                .from("product_colors")
                .update({ stock_quantity: (colorData.stock_quantity || 0) + item.quantity })
                .eq("id", item.color_id);
            }
          }
        }

        // 3. Delete stock history records for this order
        const { error: stockDeleteError } = await supabase
          .from("stock_history")
          .delete()
          .eq("order_id", selectedOrderId);

        if (stockDeleteError) {
          console.error("Failed to delete stock history:", stockDeleteError);
        }

        // 4. Delete income transaction for this order
        const { error: txDeleteError } = await supabase
          .from("transactions")
          .delete()
          .eq("order_id", selectedOrderId);

        if (txDeleteError) {
          console.error("Failed to delete transaction:", txDeleteError);
        }
      }

      // Update order status
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "rejected",
          status: "cancelled",
          payment_confirmed_at: null,
        })
        .eq("id", selectedOrderId);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Payment Issue",
        message: wasConfirmed 
          ? "Your order has been cancelled. Any stock reservations have been released."
          : "There was an issue with your payment. Please contact support or try again.",
        type: "error",
        link: "/support",
      });

      toast({
        title: "Payment Rejected",
        description: wasConfirmed 
          ? "Order cancelled, stock restored, and transaction reversed."
          : "Order has been cancelled and customer has been notified.",
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
        message: `Order ${getOrderNum(order)} has been assigned to you for delivery.`,
        type: "info",
        link: "/admin",
      });

      // Notify the customer
      const customerName = customerProfiles[order.user_id]?.full_name || "Customer";
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Order Out for Delivery! 🚚",
        message: `Great news! Your order ${getOrderNum(order)} is now out for delivery.`,
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
          message: `Your order ${getOrderNum(order)} is now out for delivery.`,
          type: "success",
        },
        delivered: {
          title: "Order Delivered! 📦",
          message: `Your order ${getOrderNum(order)} has been delivered. Enjoy!`,
          type: "success",
        },
        shipped: {
          title: "Order Shipped! 🚚",
          message: `Your order ${getOrderNum(order)} has been shipped and is on its way.`,
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

  const handleReturnOrder = async () => {
    if (!selectedOrderId || !returnReason.trim()) return;
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;

    try {
      const timestamp = new Date().toLocaleString();
      const existingNotes = order.notes || "";
      const returnNote = `\n[RETURN - ${timestamp}] Reason: ${returnReason.trim()}`;
      
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "returned",
          notes: existingNotes + returnNote
        })
        .eq("id", selectedOrderId);

      if (error) throw error;

      // Notify customer
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Order Returned 🔄",
        message: `Your order ${getOrderNum(order)} has been marked as returned. Reason: ${returnReason.trim()}`,
        type: "warning",
        link: "/profile",
      });

      toast({
        title: "Order Returned",
        description: `Order marked as returned. Customer notified.`,
      });

      fetchOrders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }

    setReturnDialogOpen(false);
    setReturnReason("");
    setSelectedOrderId(null);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setEditNotes(order.notes || "");
    setEditComment("");
    setEditOrderNumber(order.order_number || "");
    setEditOrderDate(new Date(order.created_at).toISOString().split("T")[0]);
  };

  const handleSaveEdit = async () => {
    if (!editingOrderId) return;

    try {
      const timestamp = new Date().toISOString();
      const currentNotes = orders.find(o => o.id === editingOrderId)?.notes || "";
      const newNotes = `${currentNotes}\n\n[${timestamp}] Edit by admin: ${editComment}\nUpdated notes: ${editNotes}`.trim();

      const updateData: Record<string, any> = { notes: newNotes };
      if (editOrderNumber.trim()) {
        updateData.order_number = editOrderNumber.trim();
      }
      if (editOrderDate) {
        updateData.created_at = new Date(editOrderDate).toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
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

  const orderStatusOpts = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending", color: "bg-gold/20 text-gold" },
    { value: "processing", label: "Processing", color: "bg-cyan-light/50 text-teal" },
    { value: "on_delivery", label: "On Delivery", color: "bg-cyan-light/50 text-teal" },
    { value: "shipped", label: "Shipped", color: "bg-mint/30 text-primary" },
    { value: "delivered", label: "Delivered", color: "bg-primary/20 text-primary" },
    { value: "cancelled", label: "Cancelled", color: "bg-coral/20 text-coral" },
    { value: "returned", label: "Returned", color: "bg-gold/20 text-gold" },
  ];

  const { filters: orderFilters, setFilters: setOrderFilters, filteredData: filteredOrders } = useDataFilter(
    orders,
    (o) => o.created_at,
    (o) => `${o.id} ${o.shipping_address || ""} ${o.phone || ""} ${o.notes || ""} ${customerProfiles[o.user_id]?.full_name || ""}`,
    (o) => o.status,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingPayments = filteredOrders.filter(o => o.payment_status === "uploaded" || o.payment_status === "pending");
  const otherOrders = filteredOrders.filter(o => o.payment_status !== "uploaded" && o.payment_status !== "pending");

  const filteredRevenue = filteredOrders
    .filter(o => o.payment_status === "confirmed")
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-primary">ރ</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Total Revenue</p>
            <p className="text-lg font-bold text-foreground">{formatMVR(filteredRevenue)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "pending", bg: "bg-gold/20", text: "text-gold" },
            { key: "processing", bg: "bg-cyan-light/50", text: "text-teal" },
            { key: "on_delivery", bg: "bg-blue-500/20", text: "text-blue-500" },
            { key: "shipped", bg: "bg-mint/30", text: "text-mint" },
            { key: "delivered", bg: "bg-primary/20", text: "text-primary" },
            { key: "completed", bg: "bg-emerald-500/20", text: "text-emerald-500" },
            { key: "cancelled", bg: "bg-coral/20", text: "text-coral" },
            { key: "returned", bg: "bg-gold/20", text: "text-gold" },
          ].map(s => {
            const count = filteredOrders.filter(o => o.status === s.key).length;
            if (count === 0) return null;
            return (
              <span key={s.key} className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.bg} ${s.text} capitalize font-medium`}>
                {s.key.replace("_", " ")} {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <DataFilterBar
        searchPlaceholder="Search by order ID, customer, address, phone..."
        statusOptions={orderStatusOpts}
        statusLabel="Order Status"
        onFiltersChange={setOrderFilters}
      />

      {/* Add Order Dialog */}
      <AddOrderDialog
        open={showAddOrderDialog}
        onOpenChange={setShowAddOrderDialog}
        onOrderCreated={fetchOrders}
      />

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
                  itemsLoaded={Object.prototype.hasOwnProperty.call(orderItems, order.id)}
                  isSuperAdmin={isSuperAdmin}
                  isAdmin={isAdmin}
                  isEditing={editingOrderId === order.id}
                  editNotes={editNotes}
                  editComment={editComment}
                  editOrderNumber={editOrderNumber}
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
                  onEditOrderNumberChange={setEditOrderNumber}
                  editOrderDate={editOrderDate}
                  onEditOrderDateChange={setEditOrderDate}
                  onViewReceipt={(url) => setViewingReceipt(url)}
                  onViewInvoice={async () => {
                    const invoice = await buildInvoiceData(order);
                    setInvoiceData(invoice);
                    setShowInvoice(true);
                  }}
                  onAssignDelivery={() => {
                    setSelectedOrderId(order.id);
                    setAssignDialogOpen(true);
                  }}
                  onUpdateStatus={(status) => handleUpdateOrderStatus(order.id, status)}
                  onReturn={() => {
                    setSelectedOrderId(order.id);
                    setReturnDialogOpen(true);
                  }}
                  deliveryStaff={deliveryStaff}
                  assignedStaffName={assignedStaff?.full_name || undefined}
                  confirmedByName={order.confirmed_by ? confirmerProfiles[order.confirmed_by]?.full_name || undefined : undefined}
                  customerName={customerProfiles[order.user_id]?.full_name || undefined}
                   bankNames={bankNames}
                   cardTypeNames={cardTypeNames}
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
                itemsLoaded={Object.prototype.hasOwnProperty.call(orderItems, order.id)}
                isSuperAdmin={isSuperAdmin}
                isAdmin={isAdmin}
                isEditing={editingOrderId === order.id}
                editNotes={editNotes}
                editComment={editComment}
                editOrderNumber={editOrderNumber}
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
                onEditOrderNumberChange={setEditOrderNumber}
                editOrderDate={editOrderDate}
                onEditOrderDateChange={setEditOrderDate}
                onViewInvoice={async () => {
                  const invoice = await buildInvoiceData(order);
                  setInvoiceData(invoice);
                  setShowInvoice(true);
                }}
                onAssignDelivery={() => {
                  setSelectedOrderId(order.id);
                  setAssignDialogOpen(true);
                }}
                onUpdateStatus={(status) => handleUpdateOrderStatus(order.id, status)}
                onReturn={() => {
                  setSelectedOrderId(order.id);
                  setReturnDialogOpen(true);
                }}
                deliveryStaff={deliveryStaff}
                assignedStaffName={assignedStaff?.full_name || undefined}
                confirmedByName={order.confirmed_by ? confirmerProfiles[order.confirmed_by]?.full_name || undefined : undefined}
                customerName={customerProfiles[order.user_id]?.full_name || undefined}
                bankNames={bankNames}
                cardTypeNames={cardTypeNames}
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
          <div className="bg-card border border-border rounded-2xl p-4 max-w-lg w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
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

      {/* Return Dialog */}
      {returnDialogOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setReturnDialogOpen(false);
            setReturnReason("");
            setSelectedOrderId(null);
          }}
        >
          <div 
            className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-destructive" />
              Return Products
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for returning this order. The customer will be notified.
            </p>
            
            <Textarea
              placeholder="Enter return reason..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="min-h-[100px]"
            />

            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleReturnOrder}
                disabled={!returnReason.trim()}
                variant="destructive"
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Confirm Return
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setReturnDialogOpen(false);
                  setReturnReason("");
                  setSelectedOrderId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}


      {showInvoice && invoiceData && (
        <POSInvoice
          invoice={invoiceData}
          onClose={() => {
            setShowInvoice(false);
            setInvoiceData(null);
          }}
        />
      )}
    </div>
  );
};

const OrderCard = ({
  order,
  isExpanded,
  items,
  itemsLoaded,
  isSuperAdmin,
  isAdmin,
  isEditing,
  editNotes,
  editComment,
  editOrderNumber,
  editOrderDate,
  onToggle,
  onConfirm,
  onReject,
  onDelete,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNotesChange,
  onEditCommentChange,
  onEditOrderNumberChange,
  onEditOrderDateChange,
  onViewReceipt,
  onViewInvoice,
  onAssignDelivery,
  onUpdateStatus,
  onReturn,
  deliveryStaff,
  assignedStaffName,
  confirmedByName,
  customerName,
  bankNames,
  cardTypeNames,
  getPaymentStatusConfig,
}: {
  order: Order;
  isExpanded: boolean;
  items: OrderItem[];
  itemsLoaded: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEditing: boolean;
  editNotes: string;
  editComment: string;
  editOrderNumber?: string;
  editOrderDate?: string;
  onToggle: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onEditNotesChange?: (value: string) => void;
  onEditCommentChange?: (value: string) => void;
  onEditOrderNumberChange?: (value: string) => void;
  onEditOrderDateChange?: (value: string) => void;
  onViewReceipt?: (url: string) => void;
  onViewInvoice?: () => void;
  onAssignDelivery?: () => void;
  onUpdateStatus?: (status: string) => void;
  onReturn?: () => void;
  deliveryStaff?: DeliveryStaff[];
  assignedStaffName?: string;
  confirmedByName?: string;
  customerName?: string;
  bankNames?: Record<string, string>;
  cardTypeNames?: Record<string, string>;
  getPaymentStatusConfig: (status: string) => any;
}) => {
  const statusConfig = getPaymentStatusConfig(order.payment_status || "pending");
  const StatusIcon = statusConfig.icon;

  return (
    <div className="glass-card rounded-2xl shadow-soft overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-left"
      >
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${statusConfig.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm sm:text-base truncate">
              {getOrderNum(order)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${
              order.status === "pending" ? "bg-gold/20 text-gold" :
              order.status === "processing" ? "bg-cyan-light/50 text-teal" :
              order.status === "on_delivery" ? "bg-blue-500/20 text-blue-500" :
              order.status === "shipped" ? "bg-mint/30 text-mint" :
              order.status === "delivered" ? "bg-primary/20 text-primary" :
              order.status === "cancelled" ? "bg-coral/20 text-coral" :
              order.status === "returned" ? "bg-gold/20 text-gold" :
              order.status === "completed" ? "bg-emerald-500/20 text-emerald-500" :
              "bg-muted text-muted-foreground"
            }`}>
              {order.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-foreground text-sm sm:text-base">{formatMVR(order.total_amount)}</p>
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
              {!itemsLoaded && <p className="text-xs text-muted-foreground">Loading items...</p>}
              {itemsLoaded && items.length === 0 && <p className="text-xs text-muted-foreground">No items found for this order.</p>}
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-0.5">
                  <span>
                    {item.item_code && <span className="text-primary font-mono text-xs">[{item.item_code}] </span>}
                    <span className="font-medium">{item.product_name}</span>
                    <span className="text-muted-foreground"> x{item.quantity}</span>
                  </span>
                  <span className="font-medium flex-shrink-0 ml-2">{formatMVR(item.product_price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Payment Info */}
            <div className="p-2.5 bg-muted/30 rounded-lg">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Payment</h5>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                  {order.payment_method === "bank_transfer" ? "Bank Transfer"
                    : order.payment_method === "card" ? "Card"
                    : order.payment_method === "check" ? "Check"
                    : order.payment_method === "cash" ? "Cash"
                    : order.payment_method || "Unknown"}
                </span>
                {order.payment_method === "bank_transfer" && order.payment_bank_id && bankNames[order.payment_bank_id] && (
                  <span className="text-xs text-muted-foreground">🏦 {bankNames[order.payment_bank_id]}</span>
                )}
                {order.payment_method === "card" && order.payment_card_type_id && cardTypeNames[order.payment_card_type_id] && (
                  <span className="text-xs text-muted-foreground">💳 {cardTypeNames[order.payment_card_type_id]}</span>
                )}
                {order.payment_reference && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {order.payment_method === "check" ? `Check #${order.payment_reference}` : `Ref: ${order.payment_reference}`}
                  </span>
                )}
              </div>
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

            {/* Order Source / Approved By Info */}
            {(confirmedByName || order.payment_method === "pos") && (
              <div className="p-2 bg-muted/30 rounded-lg">
                {order.payment_method === "pos" ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">POS Order</span>
                    {confirmedByName && (
                      <> • Added by <span className="font-medium text-foreground">{confirmedByName}</span></>
                    )}
                  </p>
                ) : confirmedByName && (
                  <p className="text-xs text-muted-foreground">
                    Approved by <span className="font-medium text-foreground">{confirmedByName}</span>
                  </p>
                )}
                  </div>
                )}

            {/* Edit form */}
            {isEditing && onEditNotesChange && onEditCommentChange && onSaveEdit && onCancelEdit && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
                {(isSuperAdmin || isAdmin) && (
                  <div>
                    <Label htmlFor="edit-order-number" className="text-xs">Order Number</Label>
                    <Input
                      id="edit-order-number"
                      placeholder="e.g. RCJOY/25/03/00001"
                      value={editOrderNumber || ""}
                      onChange={(e) => onEditOrderNumberChange?.(e.target.value)}
                      className="mt-1 font-mono"
                    />
                  </div>
                )}
                {isSuperAdmin && (
                  <div>
                    <Label htmlFor="edit-order-date" className="text-xs">Order Date</Label>
                    <Input
                      id="edit-order-date"
                      type="date"
                      value={editOrderDate || ""}
                      onChange={(e) => onEditOrderDateChange?.(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
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

            {/* Invoice & Receipt buttons */}
            <div className="flex flex-wrap gap-2">
              {onViewInvoice && (
                <button
                  onClick={onViewInvoice}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">View Invoice</span>
                </button>
              )}
              {order.receipt_url && onViewReceipt && (
                <button
                  onClick={() => onViewReceipt(order.receipt_url!)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">View Receipt</span>
                </button>
              )}
            </div>

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

            {/* Assign to delivery (confirmed orders with shipping address, not yet delivered) */}
            {order.payment_status === "confirmed" &&
              order.shipping_address &&
              !["delivered", "completed", "cancelled", "returned"].includes(order.status) &&
              isAdmin &&
              onAssignDelivery && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={onAssignDelivery}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    {order.assigned_to ? "Reassign Delivery" : "Assign to Delivery"}
                  </button>
                  {order.assigned_to && assignedStaffName && (
                    <span className="text-xs text-muted-foreground">
                      Assigned to <span className="font-medium text-foreground">{assignedStaffName}</span>
                    </span>
                  )}
                </div>
              )}

            {/* Admin actions */}
            {!isEditing && (
              <div className="flex gap-2 pt-2 border-t border-border">
                {isSuperAdmin && onEdit && (
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
