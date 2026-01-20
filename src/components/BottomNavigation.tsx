import { Home, Grid3X3, HelpCircle, User, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { totalItems } = useCart();

  const navItems = [
    { icon: Home, path: "/home", label: "Home" },
    { icon: Grid3X3, path: "/categories", label: "Categories" },
    { icon: ShoppingCart, path: "/cart", label: "Cart", badge: totalItems },
    { icon: HelpCircle, path: "/support", label: "Support" },
    { icon: User, path: user ? "/profile" : "/login", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-safe">
      {/* Gradient fade effect at top */}
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      
      {/* Main navigation bar */}
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 px-2 py-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200"
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
                
                <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10"
                    : "hover:bg-muted/50"
                }`}>
                  <item.icon className={`w-5 h-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`} />
                  
                  {/* Badge for cart */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-coral text-white text-[10px] flex items-center justify-center font-medium">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                
                <span className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;