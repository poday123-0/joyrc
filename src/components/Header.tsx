import { Bell, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  userName?: string;
}

const Header = ({ userName }: HeaderProps) => {
  const { totalItems } = useCart();
  const { user } = useAuth();

  const displayName = userName || user?.user_metadata?.full_name || "Guest";
  const greeting = new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <Link to={user ? "/profile" : "/login"}>
          <div className="w-10 h-10 rounded-full gradient-cta flex items-center justify-center text-white font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">{greeting}</p>
          <p className="font-semibold text-foreground">{displayName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link 
          to="/cart"
          className="relative w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
        >
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-coral text-white text-xs flex items-center justify-center font-medium">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </Link>
        <button className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </header>
  );
};

export default Header;
