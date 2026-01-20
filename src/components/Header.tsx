import { useState, useEffect } from "react";
import { ShoppingBag, Search } from "lucide-react";
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

  const navItems = [
    { path: "/home", label: "Home" },
    { path: "/categories", label: "Store" },
    { path: "/support", label: "Support" },
  ];

  const allNavItems = isAdmin 
    ? [...navItems, { path: "/admin", label: "Admin" }]
    : navItems;

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-saturate-150 backdrop-blur-xl border-b border-border/20">
      <nav className="h-11 flex items-center justify-between px-4 sm:px-6 max-w-[980px] mx-auto">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-5 h-5 object-contain"
            />
          ) : (
            <span className="text-lg">🎮</span>
          )}
        </Link>

        {/* Center Navigation - visible on all screens */}
        <div className="flex items-center justify-center gap-4 sm:gap-7">
          {allNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`text-[11px] sm:text-xs font-normal transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-foreground/80 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-4">
          <button className="text-foreground/80 hover:text-foreground transition-colors">
            <Search className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <Link 
            to="/cart"
            className="relative text-foreground/80 hover:text-foreground transition-colors"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-medium">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
