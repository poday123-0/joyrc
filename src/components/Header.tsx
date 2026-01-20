import { useState, useEffect } from "react";
import { Bell, ShoppingCart, Home, Grid3X3, HelpCircle, User, Settings, Search } from "lucide-react";
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
  const [showSearch, setShowSearch] = useState(false);

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
    <header className="flex items-center justify-between py-2 lg:py-3">
      <div className="flex items-center gap-2 lg:gap-3">
        <Link to="/">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full gradient-cta flex items-center justify-center text-white font-semibold text-sm lg:text-base">
              🎮
            </div>
          )}
        </Link>
        <div className="hidden sm:block">
          <p className="text-[10px] lg:text-xs text-muted-foreground leading-tight">{greeting}</p>
          <p className="font-semibold text-foreground text-sm lg:text-base leading-tight">{displayName}</p>
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

      <div className="flex items-center gap-1.5 lg:gap-2">
        {/* Search Button */}
        <button 
          onClick={() => setShowSearch(!showSearch)}
          className="w-8 h-8 lg:w-10 lg:h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
        >
          <Search className="w-4 h-4 lg:w-5 lg:h-5 text-foreground" />
        </button>
        <Link 
          to="/cart"
          className="relative w-8 h-8 lg:w-10 lg:h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
        >
          <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-foreground" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-coral text-white text-[10px] lg:text-xs flex items-center justify-center font-medium">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </Link>
        <button className="w-8 h-8 lg:w-10 lg:h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors">
          <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-foreground" />
        </button>
        <Link 
          to={user ? "/profile" : "/login"}
          className="hidden lg:flex w-10 h-10 rounded-full glass-card items-center justify-center hover:bg-white/80 transition-colors"
        >
          <User className="w-5 h-5 text-foreground" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
