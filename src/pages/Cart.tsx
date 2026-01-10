import { Link } from "react-router-dom";
import { ChevronLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen gradient-hero">
        <div className="container max-w-md mx-auto px-4 pt-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </Link>
            <h1 className="font-semibold text-foreground">Shopping Cart</h1>
            <div className="w-10" />
          </div>

          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-4xl">🛒</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Your cart is empty</h2>
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
    <div className="min-h-screen gradient-hero pb-32">
      <div className="container max-w-md mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-foreground">Shopping Cart ({items.length})</h1>
          <button
            onClick={clearCart}
            className="text-xs text-coral hover:text-coral/80 transition-colors"
          >
            Clear all
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-2xl p-4 flex gap-4 shadow-soft"
            >
              <div className="w-20 h-20 rounded-xl bg-gradient-to-b from-cyan-light/30 to-white flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-contain"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{item.name}</h3>
                <p className="text-lg font-bold text-foreground mt-1">
                  ${item.price.toFixed(2)}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center hover:bg-coral/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-coral" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl">
        <div className="container max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
          <button className="w-full py-4 rounded-full gradient-cta text-white font-semibold shadow-elevated hover:opacity-90 transition-opacity">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
