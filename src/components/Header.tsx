import { useState, useEffect } from "react";
import { ShoppingCart, Menu, X, Search, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface HeaderProps {
  userName?: string;
}

const Header = ({ userName }: HeaderProps) => {
  const { totalItems } = useCart();
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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

  const navItems = [
    { path: "/home", label: "Home" },
    { path: "/categories", label: "Categories" },
    { path: "/support", label: "Support" },
  ];

  const allNavItems = isAdmin 
    ? [...navItems, { path: "/admin", label: "Admin" }]
    : navItems;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Apple-style navigation bar */}
      <nav className="bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-11">
            {/* Left: Menu button (mobile) / Logo */}
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <button className="lg:hidden p-1 -ml-1 text-foreground/80 hover:text-foreground transition-colors">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="flex flex-col h-full">
                    {/* Mobile menu header */}
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        {logoUrl ? (
                          <img 
                            src={logoUrl} 
                            alt="Logo" 
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg gradient-cta flex items-center justify-center text-white font-semibold text-sm">
                            🎮
                          </div>
                        )}
                        <span className="font-semibold text-foreground">RC Joy</span>
                      </div>
                    </div>
                    
                    {/* Mobile menu items */}
                    <div className="flex-1 py-4">
                      {allNavItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMenuOpen(false)}
                            className={`block px-6 py-3 text-lg font-medium transition-colors ${
                              isActive
                                ? "text-foreground bg-muted/50"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>

                    {/* Mobile menu footer */}
                    <div className="p-4 border-t border-border/50">
                      <Link
                        to={user ? "/profile" : "/login"}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <User className="w-5 h-5" />
                        <span className="font-medium">
                          {user ? "Profile" : "Sign In"}
                        </span>
                      </Link>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Logo */}
              <Link to="/" className="flex items-center">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg gradient-cta flex items-center justify-center text-white font-semibold text-xs">
                    🎮
                  </div>
                )}
              </Link>
            </div>

            {/* Center: Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {allNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-xs font-medium transition-colors ${
                      isActive
                        ? "text-foreground"
                        : "text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Action icons */}
            <div className="flex items-center gap-3">
              <button className="p-1 text-foreground/80 hover:text-foreground transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <Link 
                to="/cart"
                className="relative p-1 text-foreground/80 hover:text-foreground transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </Link>
              <Link 
                to={user ? "/profile" : "/login"}
                className="hidden lg:block p-1 text-foreground/80 hover:text-foreground transition-colors"
              >
                <User className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
