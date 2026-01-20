import { Link } from "react-router-dom";
import { ChevronLeft, Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatMVR } from "@/lib/currency";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  if (items.length === 0) {
    return (
      <div className="min-h-screen gradient-hero">
        <div className="container max-w-4xl mx-auto px-4 lg:px-8 pt-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </Link>
            <h1 className="font-semibold text-foreground text-lg lg:text-xl">Shopping Cart</h1>
            <div className="w-10" />
          </div>

          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-4xl lg:text-5xl">🛒</span>
            </div>
            <h2 className="text-lg lg:text-xl font-semibold text-foreground">Your cart is empty</h2>
            <p className="text-sm text-muted-foreground mt-2">Start shopping to add items</p>
            <Link
              to="/"
              className="mt-6 px-6 py-3 rounded-full gradient-cta text-white font-medium shadow-soft"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-32 lg:pb-8">
      <div className="container max-w-4xl mx-auto px-4 lg:px-8 pt-4">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-foreground text-lg lg:text-xl">Shopping Cart ({items.length})</h1>
          <button
            onClick={clearCart}
            className="text-xs text-coral hover:text-coral/80 transition-colors"
          >
            Clear all
          </button>
        </div>

        <div className="lg:flex lg:gap-8">
          {/* Cart Items */}
          <div className="flex-1 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="glass-card rounded-2xl p-4 flex gap-4 shadow-soft"
              >
                <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-xl bg-gradient-to-b from-cyan-light/30 to-white flex items-center justify-center overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground lg:text-lg">{item.name}</h3>
                  <p className="text-lg lg:text-xl font-bold text-foreground mt-1">
                    {formatMVR(item.price)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-medium w-8 text-center lg:text-lg">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-coral/10 flex items-center justify-center hover:bg-coral/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-coral" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Checkout Summary */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="glass-card rounded-2xl p-6 shadow-soft sticky top-4">
              <h2 className="font-semibold text-lg text-foreground mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatMVR(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-mint font-medium">Free</span>
                </div>
              </div>
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">{formatMVR(totalPrice)}</span>
                </div>
              </div>
              <Link
                to={user ? "/checkout" : "/login"}
                className="w-full py-4 rounded-full gradient-cta text-white font-semibold shadow-elevated hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {user ? "Proceed to Checkout" : "Sign in to Checkout"}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom checkout bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl">
        <div className="container max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">
              {formatMVR(totalPrice)}
            </span>
          </div>
          <Link
            to={user ? "/checkout" : "/login"}
            className="w-full py-4 rounded-full gradient-cta text-white font-semibold shadow-elevated hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {user ? "Proceed to Checkout" : "Sign in to Checkout"}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
