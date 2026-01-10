import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Phone, FileText, CreditCard } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    address: "",
    phone: "",
    notes: "",
  });
  const [placing, setPlacing] = useState(false);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to place an order.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add some items to your cart first.",
        variant: "destructive",
      });
      return;
    }

    setPlacing(true);

    try {
      // Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total_amount: totalPrice,
          shipping_address: formData.address.trim(),
          phone: formData.phone.trim(),
          notes: formData.notes.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear the cart and redirect
      clearCart();
      toast({
        title: "Order placed successfully!",
        description: "We'll process your order soon.",
      });
      navigate("/profile");
    } catch (error: any) {
      toast({
        title: "Error placing order",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen gradient-hero">
        <div className="container max-w-md mx-auto px-4 pt-4">
          <div className="flex items-center justify-between">
            <Link
              to="/cart"
              className="w-10 h-10 rounded-full glass-card flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </Link>
            <h1 className="font-semibold text-foreground">Checkout</h1>
            <div className="w-10" />
          </div>

          <div className="flex flex-col items-center justify-center h-[60vh]">
            <p className="text-muted-foreground">Your cart is empty</p>
            <Link
              to="/"
              className="mt-4 px-6 py-3 rounded-full gradient-cta text-white font-medium"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-32">
      <div className="container max-w-md mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/cart"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-foreground">Checkout</h1>
          <div className="w-10" />
        </div>

        {/* Order Summary */}
        <div className="glass-card rounded-2xl p-4 shadow-soft mb-4">
          <h2 className="font-semibold text-foreground mb-3">Order Summary</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.name} x{item.quantity}
                </span>
                <span className="font-medium">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Form */}
        <form onSubmit={handlePlaceOrder} className="space-y-4">
          <div className="glass-card rounded-2xl p-4 shadow-soft">
            <h2 className="font-semibold text-foreground mb-3">Shipping Details</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" /> Shipping Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your full address"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent resize-none h-24"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (234) 567-890"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4" /> Order Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions for delivery..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent resize-none h-20"
                />
              </div>
            </div>
          </div>

          {/* Payment info placeholder */}
          <div className="glass-card rounded-2xl p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Payment</h3>
                <p className="text-xs text-muted-foreground">Cash on Delivery</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl">
        <div className="container max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="w-full py-4 rounded-full gradient-cta text-white font-semibold shadow-elevated disabled:opacity-50"
          >
            {placing ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
