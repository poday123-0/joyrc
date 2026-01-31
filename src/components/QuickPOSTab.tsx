import { useState, useEffect } from "react";
import { Search, Plus, Minus, Trash2, ShoppingBag, Check, Package, X, Palette, User, MapPin, Phone, FileText, Truck, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface ProductColor {
  id: string;
  color_name: string;
  color_hex: string;
  image_url: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category_id: string | null;
  item_code: string | null;
  colors?: ProductColor[];
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: ProductColor | null;
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const QuickPOSTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [colorPickerProduct, setColorPickerProduct] = useState<Product | null>(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data: productsData, error } = await supabase
      .from("products")
      .select("id, name, price, stock_quantity, image_url, category_id, item_code")
      .gt("stock_quantity", 0)
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
      setLoading(false);
      return;
    }

    const productIds = productsData?.map(p => p.id) || [];
    const { data: colorsData } = await supabase
      .from("product_colors")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order");

    const productsWithColors = (productsData || []).map(product => ({
      ...product,
      colors: colorsData?.filter(c => c.product_id === product.id) || []
    }));

    setProducts(productsWithColors);
    setLoading(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.item_code && p.item_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleProductClick = (product: Product) => {
    if (product.colors && product.colors.length > 0) {
      setColorPickerProduct(product);
    } else {
      addToCart(product, null);
    }
  };

  const addToCart = (product: Product, color: ProductColor | null) => {
    const existing = cart.find(item => 
      item.product.id === product.id && 
      (item.selectedColor?.id || null) === (color?.id || null)
    );
    
    if (existing) {
      if (existing.quantity < product.stock_quantity) {
        setCart(cart.map(item =>
          item.product.id === product.id && (item.selectedColor?.id || null) === (color?.id || null)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast({ title: "Stock limit", description: `Only ${product.stock_quantity} available`, variant: "destructive" });
      }
    } else {
      setCart([...cart, { product, quantity: 1, selectedColor: color }]);
    }
    setColorPickerProduct(null);
  };

  const updateQuantity = (productId: string, colorId: string | null, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId && (item.selectedColor?.id || null) === colorId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.stock_quantity) {
          toast({ title: "Stock limit", description: `Only ${item.product.stock_quantity} available`, variant: "destructive" });
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string, colorId: string | null) => {
    setCart(cart.filter(item => 
      !(item.product.id === productId && (item.selectedColor?.id || null) === colorId)
    ));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerDetails({ name: "", email: "", phone: "", address: "", notes: "" });
    setIsDelivery(false);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const completeSale = async () => {
    if (cart.length === 0) return;
    
    // Validate delivery details if delivery is selected
    if (isDelivery && (!customerDetails.name.trim() || !customerDetails.phone.trim() || !customerDetails.address.trim())) {
      toast({ title: "Missing Details", description: "Please fill in customer name, phone and address for delivery", variant: "destructive" });
      return;
    }
    
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get auth session for edge function call
      const { data: { session } } = await supabase.auth.getSession();

      // Determine customer user ID - create account if email provided
      let customerUserId = user.id; // Default to admin
      
      if (isDelivery && customerDetails.email.trim()) {
        // Create customer account using edge function
        const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
          body: {
            email: customerDetails.email.trim(),
            full_name: customerDetails.name.trim(),
            mobile_number: customerDetails.phone.trim(),
            password: "123456", // Default password - customer will reset
            make_admin: false,
          },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (createError) {
          console.error("Error creating customer:", createError);
          // Continue with admin as user_id if customer creation fails
        } else if (createData?.user?.id) {
          customerUserId = createData.user.id;
          console.log("Created customer account:", createData.user.email);
        }
      }

      // Build order notes
      let orderNotes = isDelivery ? "POS Delivery Order" : "Walk-in POS Sale";
      if (customerDetails.notes.trim()) {
        orderNotes += ` | Notes: ${customerDetails.notes.trim()}`;
      }
      if (customerDetails.name.trim() && customerUserId === user.id) {
        // Add customer name to notes if order is under admin's account
        orderNotes += ` | Customer: ${customerDetails.name.trim()}`;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: customerUserId,
          total_amount: totalAmount,
          status: isDelivery ? "processing" : "completed",
          payment_status: "confirmed",
          payment_method: "cash",
          payment_confirmed_at: new Date().toISOString(),
          notes: orderNotes,
          shipping_address: isDelivery ? customerDetails.address.trim() : null,
          phone: customerDetails.phone.trim() || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        color_id: item.selectedColor?.id || null,
        color_name: item.selectedColor?.color_name || null,
        color_hex: item.selectedColor?.color_hex || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update stock and create history
      for (const item of cart) {
        const newQty = item.product.stock_quantity - item.quantity;

        const { error: stockError } = await supabase
          .from("products")
          .update({ 
            stock_quantity: newQty,
            in_stock: newQty > 0 
          })
          .eq("id", item.product.id);

        if (stockError) throw stockError;

        await supabase.from("stock_history").insert({
          product_id: item.product.id,
          previous_quantity: item.product.stock_quantity,
          new_quantity: newQty,
          change_amount: -item.quantity,
          change_type: "sale",
          notes: `POS Sale - Order #${order.id.slice(0, 8)}${item.selectedColor ? ` (${item.selectedColor.color_name})` : ''}`,
          order_id: order.id,
          created_by: user.id,
        });
      }

      // Create income transaction
      await supabase.from("transactions").insert({
        type: "income",
        category: "Product Sales",
        amount: totalAmount,
        description: `POS ${isDelivery ? 'Delivery' : 'Sale'} - ${totalItems} item(s) - Order #${order.id.slice(0, 8)}${customerDetails.name ? ` - ${customerDetails.name}` : ''}`,
        order_id: order.id,
        added_by: user.id,
      });

      // Send email notification to customer if they have an account
      if (isDelivery && customerDetails.email.trim() && customerUserId !== user.id) {
        try {
          await supabase.functions.invoke('send-order-notification', {
            body: {
              orderId: order.id,
              type: 'payment_confirmed',
              customerUserId: customerUserId,
            },
          });
        } catch (emailError) {
          console.error("Failed to send customer email:", emailError);
        }
      }

      toast({
        title: isDelivery ? "Order Created! 📦" : "Sale Complete! 🎉",
        description: `${formatMVR(totalAmount)} - ${totalItems} item(s)${customerDetails.name ? ` for ${customerDetails.name}` : ''}${customerDetails.email ? ' (Account created)' : ''}`,
      });

      clearCart();
      setShowCart(false);
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Sale Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-200px)] min-h-[500px]">
      {/* Color Picker Modal */}
      {colorPickerProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-4 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Select Color</h3>
              </div>
              <button onClick={() => setColorPickerProduct(null)} className="p-1.5 hover:bg-muted rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3 truncate">{colorPickerProduct.name}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {colorPickerProduct.colors?.map(color => (
                <button
                  key={color.id}
                  onClick={() => addToCart(colorPickerProduct, color)}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
                >
                  <div className="w-5 h-5 rounded-full border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: color.color_hex }} />
                  <span className="text-xs font-medium truncate">{color.color_name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => addToCart(colorPickerProduct, null)}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Add without color
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Overlay */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowCart(false)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
        {/* Products Panel */}
        <div className="lg:col-span-2 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="flex flex-col p-2 bg-muted/50 hover:bg-muted border border-border rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left relative"
                  >
                    {/* Color dots */}
                    {product.colors && product.colors.length > 0 && (
                      <div className="absolute top-1 right-1 flex -space-x-0.5">
                        {product.colors.slice(0, 3).map(color => (
                          <div
                            key={color.id}
                            className="w-3 h-3 rounded-full border border-card shadow-sm"
                            style={{ backgroundColor: color.color_hex }}
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="w-full aspect-square rounded-md bg-background mb-1.5 overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <p className="font-medium text-xs text-foreground line-clamp-1">{product.name}</p>
                    {product.item_code && (
                      <p className="text-[10px] text-muted-foreground font-mono">{product.item_code}</p>
                    )}
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-primary font-semibold text-xs">{formatMVR(product.price)}</p>
                      <p className="text-[10px] text-muted-foreground">{product.stock_quantity}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel - Sliding on mobile */}
        <div className={`
          fixed lg:relative inset-y-0 right-0 w-[85%] max-w-sm lg:w-auto lg:max-w-none
          flex flex-col bg-card border-l lg:border border-border lg:rounded-xl overflow-hidden
          transform transition-transform duration-300 ease-out z-50
          ${showCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCart(false)} className="lg:hidden p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">Cart</span>
              {totalItems > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{totalItems}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive">Clear</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <ShoppingBag className="w-8 h-8 mb-1 opacity-50" />
                <p className="text-xs">Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={`${item.product.id}-${item.selectedColor?.id || 'default'}`}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-md bg-background overflow-hidden flex-shrink-0">
                    {item.selectedColor?.image_url || item.product.image_url ? (
                      <img src={item.selectedColor?.image_url || item.product.image_url || ''} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.product.name}</p>
                    {item.selectedColor && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: item.selectedColor.color_hex }} />
                        <span className="text-[10px] text-muted-foreground">{item.selectedColor.color_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.selectedColor?.id || null, -1)}
                      className="w-6 h-6 rounded bg-background flex items-center justify-center hover:bg-muted"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.selectedColor?.id || null, 1)}
                      className="w-6 h-6 rounded bg-background flex items-center justify-center hover:bg-muted"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-foreground w-14 text-right">{formatMVR(item.product.price * item.quantity)}</p>

                  <button
                    onClick={() => removeFromCart(item.product.id, item.selectedColor?.id || null)}
                    className="w-6 h-6 rounded bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))
            )}

            {/* Customer & Delivery Details */}
            {cart.length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Delivery Order</span>
                  </div>
                  <Switch checked={isDelivery} onCheckedChange={setIsDelivery} />
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Customer name"
                      value={customerDetails.name}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Phone number"
                      value={customerDetails.phone}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email (creates customer account)"
                      value={customerDetails.email}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  {isDelivery && (
                    <>
                      <div className="relative">
                        <MapPin className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <Textarea
                          placeholder="Delivery address"
                          value={customerDetails.address}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                          className="pl-8 text-xs min-h-[60px] resize-none"
                        />
                      </div>
                      <div className="relative">
                        <FileText className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <Textarea
                          placeholder="Notes (optional)"
                          value={customerDetails.notes}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, notes: e.target.value })}
                          className="pl-8 text-xs min-h-[50px] resize-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Total & Complete */}
          <div className="p-3 border-t border-border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-foreground">{formatMVR(totalAmount)}</span>
            </div>

            <button
              onClick={completeSale}
              disabled={cart.length === 0 || processing}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isDelivery ? "Create Order" : "Complete Sale"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Cart Button - Mobile */}
      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-30"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
            {totalItems}
          </span>
        </button>
      )}
    </div>
  );
};

export default QuickPOSTab;
