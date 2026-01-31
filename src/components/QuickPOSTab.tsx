import { useState, useEffect } from "react";
import { Search, Plus, Minus, Trash2, ShoppingBag, Check, Package, X, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { Input } from "@/components/ui/input";

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

const QuickPOSTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [colorPickerProduct, setColorPickerProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    // Fetch products with their colors
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

    // Fetch colors for all products
    const productIds = productsData?.map(p => p.id) || [];
    const { data: colorsData } = await supabase
      .from("product_colors")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order");

    // Map colors to products
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
    // If product has colors, show color picker
    if (product.colors && product.colors.length > 0) {
      setColorPickerProduct(product);
    } else {
      addToCart(product, null);
    }
  };

  const addToCart = (product: Product, color: ProductColor | null) => {
    const cartKey = `${product.id}-${color?.id || 'default'}`;
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

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const completeSale = async () => {
    if (cart.length === 0) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          status: "completed",
          payment_status: "confirmed",
          payment_method: "cash",
          payment_confirmed_at: new Date().toISOString(),
          notes: "Walk-in POS Sale",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items with color info
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

      // Update stock and create history for each product
      for (const item of cart) {
        const newQty = item.product.stock_quantity - item.quantity;

        // Update product stock
        const { error: stockError } = await supabase
          .from("products")
          .update({ 
            stock_quantity: newQty,
            in_stock: newQty > 0 
          })
          .eq("id", item.product.id);

        if (stockError) throw stockError;

        // Create stock history
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
        description: `POS Sale - ${totalItems} item(s) - Order #${order.id.slice(0, 8)}`,
        order_id: order.id,
        added_by: user.id,
      });

      toast({
        title: "Sale Complete! 🎉",
        description: `${formatMVR(totalAmount)} - ${totalItems} item(s) sold`,
      });

      clearCart();
      fetchProducts(); // Refresh stock
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Color Picker Modal */}
      {colorPickerProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Select Color</h3>
              </div>
              <button
                onClick={() => setColorPickerProduct(null)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">{colorPickerProduct.name}</p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {colorPickerProduct.colors?.map(color => (
                <button
                  key={color.id}
                  onClick={() => addToCart(colorPickerProduct, color)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border hover:bg-muted transition-colors"
                >
                  <div 
                    className="w-6 h-6 rounded-full border border-border shadow-sm"
                    style={{ backgroundColor: color.color_hex }}
                  />
                  <span className="text-sm font-medium truncate">{color.color_name}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => addToCart(colorPickerProduct, null)}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Add without color selection
            </button>
          </div>
        </div>
      )}

      {/* Products Panel */}
      <div className="lg:col-span-2 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or item code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package className="w-12 h-12 mb-2 opacity-50" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="flex flex-col p-3 bg-muted/50 hover:bg-muted border border-border rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left relative"
                >
                  {/* Color indicator */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="absolute top-2 right-2 flex -space-x-1">
                      {product.colors.slice(0, 3).map(color => (
                        <div
                          key={color.id}
                          className="w-4 h-4 rounded-full border-2 border-card shadow-sm"
                          style={{ backgroundColor: color.color_hex }}
                        />
                      ))}
                      {product.colors.length > 3 && (
                        <div className="w-4 h-4 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                          <span className="text-[8px] font-bold text-muted-foreground">+{product.colors.length - 3}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="w-full aspect-square rounded-lg bg-background mb-2 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm text-foreground line-clamp-2 mb-1">
                    {product.name}
                  </p>
                  {product.item_code && (
                    <p className="text-xs text-muted-foreground font-mono mb-1">
                      {product.item_code}
                    </p>
                  )}
                  <p className="text-primary font-semibold text-sm">
                    {formatMVR(product.price)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock: {product.stock_quantity}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Cart</span>
            {totalItems > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Tap products to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={`${item.product.id}-${item.selectedColor?.id || 'default'}`}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
              >
                <div className="w-12 h-12 rounded-lg bg-background overflow-hidden flex-shrink-0">
                  {item.selectedColor?.image_url || item.product.image_url ? (
                    <img
                      src={item.selectedColor?.image_url || item.product.image_url || ''}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.product.name}
                  </p>
                  {item.selectedColor && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div 
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: item.selectedColor.color_hex }}
                      />
                      <span className="text-xs text-muted-foreground">{item.selectedColor.color_name}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatMVR(item.product.price)} each
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.selectedColor?.id || null, -1)}
                    className="w-7 h-7 rounded-lg bg-background flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.selectedColor?.id || null, 1)}
                    className="w-7 h-7 rounded-lg bg-background flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right min-w-[70px]">
                  <p className="text-sm font-semibold text-foreground">
                    {formatMVR(item.product.price * item.quantity)}
                  </p>
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id, item.selectedColor?.id || null)}
                  className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Total & Complete Sale */}
        <div className="p-4 border-t border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">
              {formatMVR(totalAmount)}
            </span>
          </div>

          <button
            onClick={completeSale}
            disabled={cart.length === 0 || processing}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Complete Sale
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickPOSTab;