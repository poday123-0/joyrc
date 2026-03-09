import { Link } from "react-router-dom";
import { ShoppingBag, Settings, LogOut, Store } from "lucide-react";

interface QuickActionsProps {
  isAdmin: boolean;
  onSignOut: () => void;
}

const QuickActions = ({ isAdmin, onSignOut }: QuickActionsProps) => {
  const actions = [
    {
      to: "/cart",
      icon: ShoppingBag,
      label: "Cart",
      gradient: "from-primary/20 to-primary/5",
      iconColor: "text-primary",
    },
    {
      to: "/categories",
      icon: Store,
      label: "Shop",
      gradient: "from-accent/20 to-accent/5",
      iconColor: "text-accent-foreground",
    },
    ...(isAdmin
      ? [
          {
            to: "/admin",
            icon: Settings,
            label: "Admin",
            gradient: "from-secondary/30 to-secondary/10",
            iconColor: "text-secondary-foreground",
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            to={action.to}
            className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-border/30 hover:border-border/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-5 h-5 ${action.iconColor}`} />
            </div>
            <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">{action.label}</span>
          </Link>
        );
      })}

      <button
        onClick={onSignOut}
        className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-border/30 hover:border-destructive/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive/15 to-destructive/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <LogOut className="w-5 h-5 text-destructive" />
        </div>
        <span className="text-xs font-medium text-foreground/80 group-hover:text-destructive transition-colors">Sign Out</span>
      </button>
    </div>
  );
};

export default QuickActions;
