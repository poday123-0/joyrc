import { useState, useEffect } from "react";
import { Plus, Trash2, Package, User, Phone, MapPin, Calendar, X, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}

const AddOrderDialog = ({ open, onOpenChange, onOrderCreated }: AddOrderDialogProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Single order form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("confirmed");
  const [orderStatus, setOrderStatus] = useState("delivered");
  const [items, setItems] = useState<OrderItem[]>([{ productName: "", quantity: 1, unitPrice: 0 }]);

  // Bulk order form state
  const [bulkOrders, setBulkOrders] = useState<Array<{
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    orderDate: string;
    notes: string;
    items: OrderItem[];
  }>>([{
    customerName: "",
    customerPhone: "",
    shippingAddress: "",
    orderDate: new Date().toISOString().split("T")[0],
    notes: "",
    items: [{ productName: "", quantity: 1, unitPrice: 0 }]
  }]);

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, price")
      .order("name");
    if (data) setProducts(data);
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setShippingAddress("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setPaymentStatus("confirmed");
    setOrderStatus("delivered");
    setItems([{ productName: "", quantity: 1, unitPrice: 0 }]);
    setBulkOrders([{
      customerName: "",
      customerPhone: "",
      shippingAddress: "",
      orderDate: new Date().toISOString().split("T")[0],
      notes: "",
      items: [{ productName: "", quantity: 1, unitPrice: 0 }]
    }]);
  };

  const addItem = () => {
    setItems([...items, { productName: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = { 
        ...newItems[index], 
        productName: product.name,
        unitPrice: product.price 
      };
      setItems(newItems);
    }
  };

  const calculateTotal = (orderItems: OrderItem[]) => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validItems = items.filter(item => item.productName && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      toast({ title: "Error", description: "Please add at least one valid item", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const total = calculateTotal(validItems);
      const orderNotes = `[MANUAL ORDER] Customer: ${customerName}\nPhone: ${customerPhone}\n${notes}`.trim();

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: orderStatus,
          payment_status: paymentStatus,
          payment_method: "manual",
          total_amount: total,
          shipping_address: shippingAddress,
          phone: customerPhone,
          notes: orderNotes,
          created_at: new Date(orderDate).toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      for (const item of validItems) {
        await supabase.from("order_items").insert({
          order_id: newOrder.id,
          product_id: newOrder.id, // Placeholder if no product match
          product_name: item.productName,
          product_price: item.unitPrice,
          quantity: item.quantity,
        });
      }

      // Create transaction if payment confirmed
      if (paymentStatus === "confirmed") {
        await supabase.from("transactions").insert({
          type: "income",
          category: "Manual Order",
          amount: total,
          description: `Manual Order - ${customerName}`,
          order_id: newOrder.id,
        });
      }

      toast({
        title: "Order Created",
        description: `Order for ${customerName} created successfully.`,
      });

      resetForm();
      onOpenChange(false);
      onOrderCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Bulk order functions
  const addBulkOrder = () => {
    setBulkOrders([...bulkOrders, {
      customerName: "",
      customerPhone: "",
      shippingAddress: "",
      orderDate: new Date().toISOString().split("T")[0],
      notes: "",
      items: [{ productName: "", quantity: 1, unitPrice: 0 }]
    }]);
  };

  const removeBulkOrder = (index: number) => {
    if (bulkOrders.length > 1) {
      setBulkOrders(bulkOrders.filter((_, i) => i !== index));
    }
  };

  const updateBulkOrder = (orderIndex: number, field: string, value: string) => {
    const newOrders = [...bulkOrders];
    newOrders[orderIndex] = { ...newOrders[orderIndex], [field]: value };
    setBulkOrders(newOrders);
  };

  const addBulkOrderItem = (orderIndex: number) => {
    const newOrders = [...bulkOrders];
    newOrders[orderIndex].items.push({ productName: "", quantity: 1, unitPrice: 0 });
    setBulkOrders(newOrders);
  };

  const removeBulkOrderItem = (orderIndex: number, itemIndex: number) => {
    const newOrders = [...bulkOrders];
    if (newOrders[orderIndex].items.length > 1) {
      newOrders[orderIndex].items = newOrders[orderIndex].items.filter((_, i) => i !== itemIndex);
      setBulkOrders(newOrders);
    }
  };

  const updateBulkOrderItem = (orderIndex: number, itemIndex: number, field: keyof OrderItem, value: string | number) => {
    const newOrders = [...bulkOrders];
    newOrders[orderIndex].items[itemIndex] = { 
      ...newOrders[orderIndex].items[itemIndex], 
      [field]: value 
    };
    setBulkOrders(newOrders);
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validOrders = bulkOrders.filter(order => 
      order.customerName && 
      order.items.some(item => item.productName && item.quantity > 0 && item.unitPrice > 0)
    );

    if (validOrders.length === 0) {
      toast({ title: "Error", description: "Please add at least one valid order", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      let successCount = 0;

      for (const order of validOrders) {
        const validItems = order.items.filter(item => item.productName && item.quantity > 0 && item.unitPrice > 0);
        const total = calculateTotal(validItems);
        const orderNotes = `[MANUAL BULK ORDER] Customer: ${order.customerName}\nPhone: ${order.customerPhone}\n${order.notes}`.trim();

        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            status: "delivered",
            payment_status: "confirmed",
            payment_method: "manual",
            total_amount: total,
            shipping_address: order.shippingAddress,
            phone: order.customerPhone,
            notes: orderNotes,
            created_at: new Date(order.orderDate).toISOString(),
          })
          .select()
          .single();

        if (orderError) {
          console.error("Failed to create order:", orderError);
          continue;
        }

        for (const item of validItems) {
          await supabase.from("order_items").insert({
            order_id: newOrder.id,
            product_id: newOrder.id,
            product_name: item.productName,
            product_price: item.unitPrice,
            quantity: item.quantity,
          });
        }

        await supabase.from("transactions").insert({
          type: "income",
          category: "Manual Bulk Order",
          amount: total,
          description: `Bulk Order - ${order.customerName}`,
          order_id: newOrder.id,
        });

        successCount++;
      }

      toast({
        title: "Bulk Orders Created",
        description: `Successfully created ${successCount} orders.`,
      });

      resetForm();
      onOpenChange(false);
      onOrderCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Add Manual Order
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={mode === "single" ? "default" : "outline"}
            onClick={() => setMode("single")}
            className="flex-1"
          >
            Single Order
          </Button>
          <Button
            type="button"
            variant={mode === "bulk" ? "default" : "outline"}
            onClick={() => setMode("bulk")}
            className="flex-1"
          >
            Bulk Orders
          </Button>
        </div>

        {mode === "single" ? (
          <form onSubmit={handleSubmitSingle} className="space-y-4">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1 mb-1.5">
                  <User className="w-3.5 h-3.5" /> Customer Name
                </Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1 mb-1.5">
                <MapPin className="w-3.5 h-3.5" /> Shipping Address
              </Label>
              <Input
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter shipping address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-1 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Order Date
                </Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Order Status</Label>
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Order Items
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-1">
                      <Select onValueChange={(v) => selectProduct(index, v)}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} - {formatMVR(p.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={item.productName}
                        onChange={(e) => updateItem(index, "productName", e.target.value)}
                        placeholder="Or type product name"
                        className="mt-1 text-xs"
                      />
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                      className="text-xs"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      placeholder="Price"
                      className="text-xs"
                    />
                  </div>
                  {items.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="text-right font-semibold text-lg text-primary">
                Total: {formatMVR(calculateTotal(items))}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitBulk} className="space-y-4">
            {bulkOrders.map((order, orderIndex) => (
              <div key={orderIndex} className="p-4 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Order #{orderIndex + 1}</h4>
                  {bulkOrders.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeBulkOrder(orderIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={order.customerName}
                    onChange={(e) => updateBulkOrder(orderIndex, "customerName", e.target.value)}
                    placeholder="Customer Name"
                    className="text-sm"
                  />
                  <Input
                    value={order.customerPhone}
                    onChange={(e) => updateBulkOrder(orderIndex, "customerPhone", e.target.value)}
                    placeholder="Phone"
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={order.shippingAddress}
                    onChange={(e) => updateBulkOrder(orderIndex, "shippingAddress", e.target.value)}
                    placeholder="Shipping Address"
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={order.orderDate}
                    onChange={(e) => updateBulkOrder(orderIndex, "orderDate", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Items</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => addBulkOrderItem(orderIndex)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Item
                    </Button>
                  </div>
                  {order.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex gap-1 items-center">
                      <Input
                        value={item.productName}
                        onChange={(e) => updateBulkOrderItem(orderIndex, itemIndex, "productName", e.target.value)}
                        placeholder="Product"
                        className="flex-1 text-xs"
                      />
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateBulkOrderItem(orderIndex, itemIndex, "quantity", parseInt(e.target.value) || 1)}
                        placeholder="Qty"
                        className="w-16 text-xs"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateBulkOrderItem(orderIndex, itemIndex, "unitPrice", parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="w-24 text-xs"
                      />
                      {order.items.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => removeBulkOrderItem(orderIndex, itemIndex)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-right text-sm font-medium text-primary">
                  Subtotal: {formatMVR(calculateTotal(order.items))}
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addBulkOrder} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> Add Another Order
            </Button>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : `Create ${bulkOrders.length} Order${bulkOrders.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddOrderDialog;
