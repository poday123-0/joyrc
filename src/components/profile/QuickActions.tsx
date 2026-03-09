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
      color: "from-primary/15 to-primary/5",
      hoverColor: "hover:border-primary/40",
      iconColor: "text-primary",
    },
    {
      to: "/categories",
      icon: Store,
      label: "Shop",
      color: "from-accent/15 to-accent/5",
      hoverColor: "hover:border-accent/40",
      iconColor: "text-accent-foreground",
    },
    ...(isAdmin
      ? [
          {
            to: "/admin",
            icon: Settings,
            label: "Admin",
            color: "from-primary/15 to-primary/5",
            hoverColor: "hover:border-primary/40",
            iconColor: "text-primary",
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            to={action.to}
            className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card/70 backdrop-blur-sm border border-border/40 ${action.hoverColor} hover:bg-card hover:shadow-md transition-all duration-300`}
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
              <Icon className={`w-4 h-4 ${action.iconColor}`} />
            </div>
            <span className="text-sm font-medium text-foreground">{action.label}</span>
          </Link>
        );
      })}
      
      <button
        onClick={onSignOut}
        className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card/70 backdrop-blur-sm border border-border/40 hover:border-destructive/40 hover:bg-destructive/5 hover:shadow-md transition-all duration-300"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive/15 to-destructive/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <LogOut className="w-4 h-4 text-destructive" />
        </div>
        <span className="text-sm font-medium text-foreground">Sign Out</span>
      </button>
    </div>
  );
};

export default QuickActions;
