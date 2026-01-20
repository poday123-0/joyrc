import { useState, useEffect } from "react";
import { ShoppingBag, Search, Menu, Home, Grid3X3, HelpCircle, Settings, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import SearchOverlay from "@/components/SearchOverlay";
import rcJoyLogo from "@/assets/rc-joy-logo.jpg";

interface HeaderProps {
  userName?: string;
}

const Header = ({ userName }: HeaderProps) => {
  const { totalItems } = useCart();
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Close menu and search on route change
  useEffect(() => {
    setIsSearchOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/categories", label: "Store", icon: Grid3X3 },
    { path: "/support", label: "Support", icon: HelpCircle },
  ];

  const allNavItems = isAdmin 
    ? [...navItems, { path: "/admin", label: "Admin", icon: Settings }]
    : navItems;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/40 backdrop-saturate-150 backdrop-blur-2xl border-b border-white/5 shadow-sm">
        <nav className="h-11 flex items-center justify-between px-4 sm:px-6 max-w-[980px] mx-auto">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img 
              src={logoUrl || rcJoyLogo} 
              alt="RC Joy" 
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </Link>

          {/* Center Navigation - desktop only */}
          <div className="hidden sm:flex items-center justify-center gap-7">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-xs font-normal transition-colors ${
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
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
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
            
            {/* Menu Trigger */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <button className="text-foreground/80 hover:text-foreground transition-colors">
                  <Menu className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 border-l border-border/50">
                <div className="flex flex-col h-full bg-background">
                  {/* Menu Header */}
                  <div className="flex items-center justify-between p-5 border-b border-border/50">
                    <img 
                      src={logoUrl || rcJoyLogo} 
                      alt="RC Joy" 
                      loading="lazy"
                      decoding="async"
                      className="h-8 w-auto object-contain"
                    />
                  </div>

                  {/* Navigation Links */}
                  <div className="flex-1 py-2">
                    {allNavItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                            isActive
                              ? "text-foreground bg-muted/50"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          }`}
                        >
                          <item.icon className="w-5 h-5" strokeWidth={1.5} />
                          <span className="text-base font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* User Section */}
                  <div className="border-t border-border/50 p-5">
                    <Link
                      to={user ? "/profile" : "/login"}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {user ? (userName || user.user_metadata?.full_name || "Account") : "Sign In"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user ? "View your profile" : "Login or create account"}
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <SearchOverlay 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
};

export default Header;
