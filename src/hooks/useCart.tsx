import { useState, useEffect, createContext, useContext, ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  colorId?: string | null;
  colorName?: string | null;
  colorHex?: string | null;
  itemCode?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string, colorId?: string | null) => void;
  updateQuantity: (id: string, quantity: number, colorId?: string | null) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "rcjoy_cart";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      // Find existing item with same id AND same color
      const existing = prev.find((i) => 
        i.id === item.id && 
        (i.colorId || null) === (item.colorId || null)
      );
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && (i.colorId || null) === (item.colorId || null)
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, colorId?: string | null) => {
    setItems((prev) => prev.filter((i) => 
      !(i.id === id && (i.colorId || null) === (colorId || null))
    ));
  };

  const updateQuantity = (id: string, quantity: number, colorId?: string | null) => {
    if (quantity <= 0) {
      removeFromCart(id, colorId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => 
        i.id === id && (i.colorId || null) === (colorId || null)
          ? { ...i, quantity } 
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
