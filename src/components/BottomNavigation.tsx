import { forwardRef } from "react";
import { Home, Grid3X3, ShoppingCart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const BottomNavigation = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();
  const { user } = useAuth();
  const { totalItems } = useCart();

  const navItems = [
    { icon: Home, path: "/home", label: "Home" },
    { icon: Grid3X3, path: "/categories", label: "Browse" },
    { icon: ShoppingCart, path: "/cart", label: "Cart", badge: totalItems },
    { icon: User, path: user ? "/profile" : "/login", label: "Account" },
  ];

  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Apple-style tab bar */}
      <div className="bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border-t border-border/20 dark:border-white/10 dark:bg-background/60 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_-1px_6px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-around h-12">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center flex-1 py-1"
              >
                <div className="relative">
                  <item.icon 
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`} 
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  {/* Badge for cart */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 transition-colors ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
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
});

BottomNavigation.displayName = 'BottomNavigation';

export default BottomNavigation;
