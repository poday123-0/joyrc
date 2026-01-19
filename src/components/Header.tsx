import { useState, useEffect } from "react";
import { Bell, ShoppingCart, Home, Grid3X3, HelpCircle, User, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  userName?: string;
}

const Header = ({ userName }: HeaderProps) => {
  const { totalItems } = useCart();
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("logo_url")
        .limit(1)
        .maybeSingle();
      
      if (data?.logo_url) {
        setLogoUrl(data.logo_url);
      }
    };

    fetchLogo();
  }, []);

  const displayName = userName || user?.user_metadata?.full_name || "Guest";
  const greeting = new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 18 ? "Good Afternoon" : "Good Evening";

  const navItems = [
    { icon: Home, path: "/home", label: "Home" },
    { icon: Grid3X3, path: "/categories", label: "Categories" },
    { icon: HelpCircle, path: "/support", label: "Support" },
  ];

  return (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <Link to="/">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full gradient-cta flex items-center justify-center text-white font-semibold text-lg">
              🎮
            </div>
          )}
        </Link>
        <div>
          <p className="text-xs lg:text-sm text-muted-foreground">{greeting}</p>
          <p className="font-semibold text-foreground lg:text-lg">{displayName}</p>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all ${
              location.pathname === "/admin"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Admin</span>
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <Link 
          to="/cart"
          className="relative w-10 h-10 lg:w-11 lg:h-11 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
        >
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-coral text-white text-xs flex items-center justify-center font-medium">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </Link>
        <button className="w-10 h-10 lg:w-11 lg:h-11 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
        </button>
        <Link 
          to={user ? "/profile" : "/login"}
          className="hidden lg:flex w-11 h-11 rounded-full glass-card items-center justify-center hover:bg-white/80 transition-colors"
        >
          <User className="w-5 h-5 text-foreground" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
