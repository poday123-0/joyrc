import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Minus, Trash2, ShoppingBag, Check, Package, X, Palette, User, MapPin, Phone, FileText, Truck, Mail, UserSearch, UserPlus, Receipt, Calendar, Clock, Banknote, CreditCard, Building2, FileCheck } from "lucide-react";
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
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
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
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
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
  const [newCustomerData, setNewCustomerData] = useState({ name: "", phone: "", email: "", address: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedCardTypeId, setSelectedCardTypeId] = useState<string>("");
  const [banks, setBanks] = useState<Array<{ id: string; bank_name: string; account_name: string; account_number: string }>>([]);
  const [cardTypes, setCardTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrderData, setLastOrderData] = useState<{
    orderId: string;
    orderNumber?: string;
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
    fetchBanks();
    fetchCardTypes();
  }, []);

  const fetchProducts = async () => {
    const { data: productsData, error } = await supabase
      .from("products")
      .select("id, name, price, stock_quantity, image_url, category_id, item_code, cost_price")
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
      .select("*, stock_quantity")
      .in("product_id", productIds)
      .order("sort_order");

    const productsWithColors = (productsData || []).map(product => ({
      ...product,
      colors: colorsData?.filter(c => c.product_id === product.id) || []
    }));

    setProducts(productsWithColors);
    setLoading(false);
  };

  const fetchBanks = async () => {
    const { data } = await supabase.from("bank_settings").select("id, bank_name, account_name, account_number").eq("is_active", true).order("bank_name");
    if (data) setBanks(data);
  };

  const fetchCardTypes = async () => {
    const { data } = await supabase.from("card_types").select("id, name").eq("is_active", true).order("sort_order");
    if (data) setCardTypes(data);
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
    
    // Determine available stock: use color stock if color selected, else product stock
    const availableStock = color ? color.stock_quantity : product.stock_quantity;
    
    if (existing) {
      if (existing.quantity < availableStock) {
        setCart(cart.map(item =>
          item.product.id === product.id && (item.selectedColor?.id || null) === (color?.id || null)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast({ title: "Stock limit", description: `Only ${availableStock} available${color ? ` in ${color.color_name}` : ''}`, variant: "destructive" });
      }
    } else {
      if (availableStock <= 0) {
        toast({ title: "Out of stock", description: `${color?.color_name || product.name} is out of stock`, variant: "destructive" });
        return;
      }
      setCart([...cart, { product, quantity: 1, selectedColor: color }]);
    }
    setColorPickerProduct(null);
  };

  const updateQuantity = (productId: string, colorId: string | null, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId && (item.selectedColor?.id || null) === colorId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        const availableStock = item.selectedColor ? item.selectedColor.stock_quantity : item.product.stock_quantity;
        if (newQty > availableStock) {
          toast({ title: "Stock limit", description: `Only ${availableStock} available${item.selectedColor ? ` in ${item.selectedColor.color_name}` : ''}`, variant: "destructive" });
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

  // Search existing customers by name or phone - direct DB query for speed
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    setSearchingCustomers(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, mobile_number")
        .or(`full_name.ilike.%${query}%,mobile_number.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const customers = (profiles || []).map((c) => ({
        user_id: c.user_id,
        full_name: c.full_name,
        mobile_number: c.mobile_number,
        email: "",
      }));

      setCustomerResults(customers);
      setShowCustomerDropdown(customers.length > 0);
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setSearchingCustomers(false);
    }
  }, []);

  // Debounce customer search - minimal delay for real-time feel
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch && !selectedCustomerId) {
        searchCustomers(customerSearch);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers, selectedCustomerId]);

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
            address: newCustomerData.address.trim(),
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
          address: newCustomerData.address.trim(),
        });
        setCustomerSearch(newCustomerData.name.trim());
        toast({ title: "Customer Added", description: `${newCustomerData.name} details saved` });
      }

      setNewCustomerData({ name: "", phone: "", email: "", address: "" });
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
      if (deliveryDate || deliveryTime) {
        const dateTimeStr = [deliveryDate, deliveryTime].filter(Boolean).join(" ");
        orderNotes += ` | Delivery: ${dateTimeStr}`;
      }
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
          payment_method: paymentMethod,
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

      // Aggregate total quantity sold per product to avoid overwrite bug
      const productTotalDeductions = new Map<string, number>();
      for (const item of cart) {
        const current = productTotalDeductions.get(item.product.id) || 0;
        productTotalDeductions.set(item.product.id, current + item.quantity);
      }

      // Deduct from main product stock (once per product)
      const productStockUpdated = new Map<string, number>();
      for (const [productId, totalQty] of productTotalDeductions) {
        const product = cart.find(i => i.product.id === productId)!.product;
        const newQty = Math.max(0, product.stock_quantity - totalQty);
        productStockUpdated.set(productId, newQty);

        const { error: stockError } = await supabase
          .from("products")
          .update({ 
            stock_quantity: newQty,
            in_stock: newQty > 0 
          })
          .eq("id", productId);

        if (stockError) throw stockError;
      }

      // Deduct from color-specific stock and create history per cart item
      for (const item of cart) {
        if (item.selectedColor) {
          const colorNewQty = Math.max(0, item.selectedColor.stock_quantity - item.quantity);
          await supabase
            .from("product_colors")
            .update({ stock_quantity: colorNewQty })
            .eq("id", item.selectedColor.id);
        }

        const prevQty = item.product.stock_quantity;
        const newQty = productStockUpdated.get(item.product.id) ?? prevQty;

        await supabase.from("stock_history").insert({
          product_id: item.product.id,
          previous_quantity: prevQty,
          new_quantity: newQty,
          change_amount: -item.quantity,
          change_type: "sale",
          notes: `POS Sale - Order ${order.order_number || order.id.slice(0, 8)}${item.selectedColor ? ` (${item.selectedColor.color_name})` : ''}`,
          order_id: order.id,
          created_by: user.id,
          unit_purchase_price: item.product.cost_price || 0,
        });
      }

      // Create income transaction
      await supabase.from("transactions").insert({
        type: "income",
        category: "Product Sales",
        amount: totalAmount,
        description: `POS ${isDelivery ? 'Delivery' : 'Sale'} - ${totalItems} item(s) - Order ${order.order_number || order.id.slice(0, 8)}${customerDetails.name ? ` - ${customerDetails.name}` : ''}`,
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
        orderNumber: order.order_number || undefined,
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
                  disabled={color.stock_quantity <= 0}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border border-border transition-colors ${
                    color.stock_quantity <= 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: color.color_hex }} />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-xs font-medium truncate">{color.color_name}</span>
                    <span className="text-[10px] text-muted-foreground">{color.stock_quantity} in stock</span>
                  </div>
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
                  setNewCustomerData({ name: "", phone: "", email: "", address: "" });
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

              <div>
                <Label className="text-xs mb-1.5 block">Address (optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    placeholder="Delivery address"
                    value={newCustomerData.address}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                    className="pl-9 min-h-[60px] text-sm resize-none"
                    rows={2}
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
                  setNewCustomerData({ name: "", phone: "", email: "", address: "" });
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


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:h-full">
        {/* Products Panel */}
        <div className="lg:col-span-2 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30 space-y-3">
            {/* Customer Search Section - Above product search */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Customer</span>
              </div>
              
              {/* Selected Customer Pill */}
              {(selectedCustomerId || customerDetails.name) ? (
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{customerDetails.name || "Customer"}</p>
                      {customerDetails.phone && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {customerDetails.phone}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={clearSelectedCustomer}
                      className="p-1.5 hover:bg-primary/20 rounded-lg transition-colors"
                      title="Clear customer"
                    >
                      <X className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="h-auto w-9 flex-shrink-0"
                    title="Add new customer"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 h-9 text-sm pr-9"
                    />
                    {searchingCustomers && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
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
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{customer.full_name || "No name"}</p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {customer.mobile_number || "No phone"}
                              </p>
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
              )}
            </div>

            {/* Product Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">#</span>
                <Input
                  placeholder="Search by item code..."
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

        {/* Cart Section - Mobile-optimized without scroll */}
        <div className="lg:col-span-1 flex flex-col bg-card border border-border rounded-xl lg:overflow-hidden">
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

          {/* Content Area - No scroll on mobile */}
          <div className="flex-1 lg:overflow-y-auto lg:min-h-0">
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

              </div>
            )}
          </div>

          {/* Delivery Fields - Outside scroll area for better mobile UX */}
          {cart.length > 0 && isDelivery && (
            <div className="p-3 border-t border-border bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Delivery Details</span>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Delivery address"
                  value={customerDetails.address}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Delivery notes (optional)"
                  value={customerDetails.notes}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, notes: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {/* Fixed Footer - Total & Action */}
          {cart.length > 0 && (
            <div className="p-3 border-t border-border bg-card/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{formatMVR(totalAmount)}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { value: "cash", label: "Cash", icon: Banknote },
                  { value: "bank_transfer", label: "Transfer", icon: Building2 },
                  { value: "card", label: "Card", icon: CreditCard },
                  { value: "check", label: "Check", icon: FileCheck },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-medium transition-all min-w-0 ${
                      paymentMethod === value
                        ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate w-full text-center">{label}</span>
                  </button>
                ))}
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
