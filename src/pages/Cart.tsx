import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatMVR } from "@/lib/currency";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 lg:px-8 pt-8 pb-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full glass-card shadow-soft flex items-center justify-center hover:bg-accent/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-bold text-foreground text-xl lg:text-2xl">Shopping Cart</h1>
          </div>

          {/* Empty State */}
          <div className="glass-card rounded-3xl p-8 lg:p-12 shadow-soft text-center">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-muted mx-auto flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 lg:w-12 lg:h-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">Start shopping to add items to your cart</p>
            <Link
              to="/home"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 transition-colors"
            >
              Browse Products
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-36 lg:pb-8">
      <div className="container max-w-4xl mx-auto px-4 lg:px-8 pt-8 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full glass-card shadow-soft flex items-center justify-center hover:bg-accent/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="font-bold text-foreground text-xl lg:text-2xl">Shopping Cart</h1>
              <p className="text-sm text-muted-foreground">{items.length} item{items.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={clearCart}
            className="text-sm text-destructive hover:text-destructive/80 font-medium transition-colors"
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
                className="glass-card rounded-2xl p-4 shadow-soft"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground lg:text-lg truncate">{item.name}</h3>
                    <p className="text-xl lg:text-2xl font-bold text-primary mt-1">
                      {formatMVR(item.price)}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4 text-foreground" />
                        </button>
                        <span className="font-semibold w-8 text-center lg:text-lg text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4 text-foreground" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Checkout Summary */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="glass-card rounded-3xl p-6 shadow-soft sticky top-4">
              <h2 className="font-bold text-lg text-foreground mb-6">Order Summary</h2>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                  <span className="font-medium text-foreground">{formatMVR(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-primary font-medium">Free</span>
                </div>
              </div>
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">{formatMVR(totalPrice)}</span>
                </div>
              </div>
              <Link
                to={user ? "/checkout" : "/login"}
                className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {user ? "Proceed to Checkout" : "Sign in to Checkout"}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom checkout bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-border shadow-elevated">
        <div className="container max-w-md mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-muted-foreground">Total</span>
              <p className="text-2xl font-bold text-foreground">{formatMVR(totalPrice)}</p>
            </div>
            <span className="text-sm text-primary font-medium">Free shipping</span>
          </div>
          <Link
            to={user ? "/checkout" : "/login"}
            className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
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
