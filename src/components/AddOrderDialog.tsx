import { useState, useEffect } from "react";
import { Plus, Trash2, Package, User, Phone, MapPin, Calendar, X, ShoppingCart, Palette } from "lucide-react";
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

interface ProductColor {
  id: string;
  color_name: string;
  color_hex: string;
  product_id: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  colorId?: string;
  colorName?: string;
  colorHex?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  item_code: string | null;
}

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}

const AddOrderDialog = ({ open, onOpenChange, onOrderCreated }: AddOrderDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productColors, setProductColors] = useState<Record<string, ProductColor[]>>({});
  
  // Order form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("confirmed");
  const [orderStatus, setOrderStatus] = useState("delivered");
  const [items, setItems] = useState<OrderItem[]>([{ productId: "", productName: "", quantity: 1, unitPrice: 0 }]);

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, item_code")
      .order("name");
    if (data) setProducts(data);
  };

  const fetchColorsForProduct = async (productId: string) => {
    if (productColors[productId]) return; // Already fetched
    
    const { data } = await supabase
      .from("product_colors")
      .select("id, color_name, color_hex, product_id")
      .eq("product_id", productId)
      .order("sort_order");
    
    if (data) {
      setProductColors(prev => ({ ...prev, [productId]: data }));
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setShippingAddress("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setPaymentStatus("confirmed");
    setOrderStatus("delivered");
    setItems([{ productId: "", productName: "", quantity: 1, unitPrice: 0 }]);
  };

  const addItem = () => {
    setItems([...items, { productId: "", productName: "", quantity: 1, unitPrice: 0 }]);
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

  const selectProduct = async (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = { 
        ...newItems[index], 
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        colorId: undefined,
        colorName: undefined,
        colorHex: undefined,
      };
      setItems(newItems);
      
      // Fetch colors for this product
      await fetchColorsForProduct(productId);
    }
  };

  const selectColor = (index: number, colorId: string) => {
    const item = items[index];
    const colors = productColors[item.productId] || [];
    const color = colors.find(c => c.id === colorId);
    
    if (color) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        colorId: color.id,
        colorName: color.color_name,
        colorHex: color.color_hex,
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

      // Create order items with color info
      for (const item of validItems) {
        await supabase.from("order_items").insert({
          order_id: newOrder.id,
          product_id: item.productId || newOrder.id,
          product_name: item.productName,
          product_price: item.unitPrice,
          quantity: item.quantity,
          color_id: item.colorId || null,
          color_name: item.colorName || null,
          color_hex: item.colorHex || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Add Manual Order
          </DialogTitle>
        </DialogHeader>


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

              {items.map((item, index) => {
                const colors = productColors[item.productId] || [];
                const hasColors = colors.length > 0;
                
                return (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-1">
                          <Select onValueChange={(v) => selectProduct(index, v)}>
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.item_code ? `[${p.item_code}] ` : ""}{p.name} - {formatMVR(p.price)}
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
                    
                    {/* Color Selection */}
                    {hasColors && (
                      <div className="flex items-center gap-2 pl-1">
                        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                        <Select 
                          value={item.colorId || ""} 
                          onValueChange={(v) => selectColor(index, v)}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1 max-w-xs">
                            <SelectValue placeholder="Select color (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {colors.map((color) => (
                              <SelectItem key={color.id} value={color.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full border border-border"
                                    style={{ backgroundColor: color.color_hex }}
                                  />
                                  {color.color_name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {item.colorName && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div 
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            {item.colorName}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

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
      </DialogContent>
    </Dialog>
  );
};

export default AddOrderDialog;
