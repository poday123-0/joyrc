import { Home, Grid3X3, HelpCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Grid3X3, path: "/categories", label: "Categories" },
    { icon: HelpCircle, path: "/support", label: "Support" },
    { icon: User, path: user ? "/profile" : "/login", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm lg:hidden">
      <div className="glass-card rounded-full px-6 py-3 flex items-center justify-around shadow-elevated">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;