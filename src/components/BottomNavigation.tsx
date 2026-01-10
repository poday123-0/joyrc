import { Home, Grid3X3, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const BottomNavigation = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Grid3X3, path: "/categories", label: "Categories" },
    { icon: MessageCircle, path: "/chat", label: "Chat" },
    { icon: User, path: "/profile", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
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
