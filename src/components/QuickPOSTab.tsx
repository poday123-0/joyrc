import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Minus, Trash2, ShoppingBag, Check, Package, X, Palette, User, MapPin, Phone, FileText, Truck, Mail, UserSearch, UserPlus, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import POSInvoice from "./POSInvoice";

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

interface ExistingCustomer {
  user_id: string;
  full_name: string | null;
  mobile_number: string | null;
  email?: string;
}

const QuickPOSTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemCodeSearch, setItemCodeSearch] = useState("");
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
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<ExistingCustomer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: "", phone: "", email: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrderData, setLastOrderData] = useState<{
    orderId: string;
    orderDate: string;
    items: Array<{ name: string; quantity: number; price: number; color?: string | null }>;
    total: number;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    isDelivery: boolean;
    notes?: string;
  } | null>(null);

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

  const filteredProducts = products.filter(p => {
    const matchesName = searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    const matchesItemCode = itemCodeSearch ? (p.item_code && p.item_code.toLowerCase().includes(itemCodeSearch.toLowerCase())) : true;
    
    // If both searches are empty, show all
    if (!searchQuery && !itemCodeSearch) return true;
    // If only name search, filter by name
    if (searchQuery && !itemCodeSearch) return matchesName;
    // If only item code search, filter by item code
    if (!searchQuery && itemCodeSearch) return matchesItemCode;
    // If both, product must match both
    return matchesName && matchesItemCode;
  });

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
    setCustomerSearch("");
    setCustomerResults([]);
    setSelectedCustomerId(null);
  };

  // Search existing customers by name or phone
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    setSearchingCustomers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use edge function to get customers with emails
      const { data: customerData, error } = await supabase.functions.invoke('get-customer-users', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;

      // Filter customers by search query (name and mobile only)
      const queryLower = query.toLowerCase();
      const filteredCustomers = (customerData?.customers || [])
        .filter((c: any) => 
          c.full_name?.toLowerCase().includes(queryLower) ||
          c.mobile_number?.toLowerCase().includes(queryLower)
        )
        .slice(0, 10)
        .map((c: any) => ({
          user_id: c.user_id,
          full_name: c.full_name,
          mobile_number: c.mobile_number,
          email: c.email,
        }));

      setCustomerResults(filteredCustomers);
      setShowCustomerDropdown(filteredCustomers.length > 0);
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setSearchingCustomers(false);
    }
  }, []);

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch) {
        searchCustomers(customerSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const selectCustomer = (customer: ExistingCustomer) => {
    setSelectedCustomerId(customer.user_id);
    setCustomerDetails({
      ...customerDetails,
      name: customer.full_name || "",
      phone: customer.mobile_number || "",
      email: customer.email || "",
    });
    setCustomerSearch(customer.full_name || customer.mobile_number || "");
    setShowCustomerDropdown(false);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerSearch("");
    setCustomerDetails({ name: "", email: "", phone: "", address: "", notes: "" });
  };

  const createNewCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      toast({ title: "Error", description: "Customer name is required", variant: "destructive" });
      return;
    }

    setCreatingCustomer(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (newCustomerData.email.trim()) {
        // Create customer with email (creates auth user)
        const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
          body: {
            email: newCustomerData.email.trim(),
            full_name: newCustomerData.name.trim(),
            mobile_number: newCustomerData.phone.trim(),
            password: "123456",
            make_admin: false,
          },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (createError) throw createError;

        if (createData?.user?.id) {
          // Select the newly created customer
          setSelectedCustomerId(createData.user.id);
          setCustomerDetails({
            ...customerDetails,
            name: newCustomerData.name.trim(),
            phone: newCustomerData.phone.trim(),
            email: newCustomerData.email.trim(),
          });
          setCustomerSearch(newCustomerData.name.trim());
          toast({ title: "Customer Created", description: `${newCustomerData.name} added successfully` });
        }
      } else {
        // Just set the customer details locally (no account creation)
        setCustomerDetails({
          ...customerDetails,
          name: newCustomerData.name.trim(),
          phone: newCustomerData.phone.trim(),
          email: "",
        });
        setCustomerSearch(newCustomerData.name.trim());
        toast({ title: "Customer Added", description: `${newCustomerData.name} details saved` });
      }

      setNewCustomerData({ name: "", phone: "", email: "" });
      setShowNewCustomerModal(false);
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast({ title: "Error", description: error.message || "Failed to create customer", variant: "destructive" });
    } finally {
      setCreatingCustomer(false);
    }
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

      // Determine customer user ID - use selected existing customer, create new if email provided, or default to admin
      let customerUserId = user.id; // Default to admin
      
      if (selectedCustomerId) {
        // Use existing selected customer
        customerUserId = selectedCustomerId;
        console.log("Using existing customer:", selectedCustomerId);
      } else if (isDelivery && customerDetails.email.trim()) {
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

      // Store order data for invoice
      setLastOrderData({
        orderId: order.id,
        orderDate: new Date().toISOString(),
        items: cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          color: item.selectedColor?.color_name || null,
        })),
        total: totalAmount,
        customerName: customerDetails.name || undefined,
        customerPhone: customerDetails.phone || undefined,
        customerAddress: customerDetails.address || undefined,
        isDelivery,
        notes: customerDetails.notes || undefined,
      });

      toast({
        title: isDelivery ? "Order Created! 📦" : "Sale Complete! 🎉",
        description: `${formatMVR(totalAmount)} - ${totalItems} item(s)${customerDetails.name ? ` for ${customerDetails.name}` : ''}${customerDetails.email ? ' (Account created)' : ''}`,
      });

      clearCart();
      setShowCart(false);
      setShowInvoice(true);
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

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-4 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Add New Customer</h3>
              </div>
              <button 
                onClick={() => {
                  setShowNewCustomerModal(false);
                  setNewCustomerData({ name: "", phone: "", email: "" });
                }} 
                className="p-1.5 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block">Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Customer name"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                    className="pl-9 h-9 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-xs mb-1.5 block">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Phone number"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-xs mb-1.5 block">Email (optional - creates account)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowNewCustomerModal(false);
                  setNewCustomerData({ name: "", phone: "", email: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={createNewCustomer}
                disabled={creatingCustomer || !newCustomerData.name.trim()}
              >
                {creatingCustomer ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Customer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
        {/* Products Panel */}
        <div className="lg:col-span-2 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30 space-y-3">
            {/* Customer Search Section - Above product search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">Customer</span>
                  {(selectedCustomerId || customerDetails.name) && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      {customerDetails.name || "Selected"}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      if (selectedCustomerId) {
                        clearSelectedCustomer();
                      }
                    }}
                    className="pl-9 h-9 text-sm pr-9"
                  />
                  {searchingCustomers && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {selectedCustomerId && (
                    <button
                      onClick={clearSelectedCustomer}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  
                  {/* Customer Search Results Dropdown */}
                  {showCustomerDropdown && customerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {customerResults.map((customer) => (
                        <button
                          key={customer.user_id}
                          onClick={() => selectCustomer(customer)}
                          className="w-full px-3 py-2.5 text-left hover:bg-muted flex items-center gap-2 border-b border-border last:border-0"
                        >
                          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{customer.full_name || "No name"}</p>
                            <p className="text-xs text-muted-foreground truncate">{customer.mobile_number || "No phone"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Add New Customer Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewCustomerModal(true)}
                  className="h-9 w-9 flex-shrink-0"
                  title="Add new customer"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Product Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="relative w-28 sm:w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">#</span>
                <Input
                  placeholder="Item code"
                  value={itemCodeSearch}
                  onChange={(e) => setItemCodeSearch(e.target.value)}
                  className="pl-7 h-9 text-sm font-mono"
                />
              </div>
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

        {/* Cart Section - Mobile-optimized with scrollable items */}
        <div className="lg:col-span-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden max-h-[50vh] lg:max-h-none">
          {/* Cart Header with Delivery Toggle */}
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
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
            
            {/* Customer & Delivery Toggle Row */}
            {cart.length > 0 && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  {(selectedCustomerId || customerDetails.name) ? (
                    <div className="flex items-center gap-1.5 text-xs text-foreground truncate">
                      <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{customerDetails.name || "Customer"}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No customer</span>
                  )}
                </div>
                
                {/* Delivery Toggle */}
                <div className="flex items-center gap-2">
                  <Truck className={`w-3.5 h-3.5 ${isDelivery ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium text-foreground hidden sm:inline">Delivery</span>
                  <Switch checked={isDelivery} onCheckedChange={setIsDelivery} />
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground p-3">
                <ShoppingBag className="w-8 h-8 mb-1 opacity-50" />
                <p className="text-xs">Cart is empty</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {/* Cart Items */}
                {cart.map(item => (
                  <div 
                    key={`cart-${item.product.id}-${item.selectedColor?.id || 'default'}`}
                    className="flex items-center gap-2 bg-muted/30 rounded-lg p-2"
                  >
                    {item.selectedColor && (
                      <div 
                        className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: item.selectedColor.color_hex }}
                        title={item.selectedColor.color_name}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatMVR(item.product.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.selectedColor?.id || null, -1)}
                        className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.selectedColor?.id || null, 1)}
                        className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-primary w-16 text-right">
                      {formatMVR(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.selectedColor?.id)}
                      className="p-1.5 hover:bg-destructive/20 rounded text-destructive/70 hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Delivery Fields - Inline */}
                {isDelivery && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="relative">
                      <MapPin className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                      <Textarea
                        placeholder="Delivery address"
                        value={customerDetails.address}
                        onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                        className="pl-8 text-xs min-h-[50px] resize-none"
                      />
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                      <Textarea
                        placeholder="Notes (optional)"
                        value={customerDetails.notes}
                        onChange={(e) => setCustomerDetails({ ...customerDetails, notes: e.target.value })}
                        className="pl-8 text-xs min-h-[40px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Footer - Total & Action */}
          {cart.length > 0 && (
            <div className="p-3 border-t border-border bg-card/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{formatMVR(totalAmount)}</span>
              </div>

              <button
                onClick={completeSale}
                disabled={cart.length === 0 || processing}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-[0.98] transition-all"
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
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && lastOrderData && (
        <POSInvoice 
          invoice={lastOrderData} 
          onClose={() => {
            setShowInvoice(false);
            setLastOrderData(null);
          }} 
        />
      )}
    </div>
  );
};

export default QuickPOSTab;
