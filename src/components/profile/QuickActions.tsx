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
      bg: "bg-primary/10 dark:bg-primary/20",
      iconColor: "text-primary",
      hoverBorder: "hover:border-primary/40",
    },
    {
      to: "/categories",
      icon: Store,
      label: "Shop",
      bg: "bg-accent/10 dark:bg-accent/20",
      iconColor: "text-accent",
      hoverBorder: "hover:border-accent/40",
    },
    ...(isAdmin
      ? [
          {
            to: "/admin",
            icon: Settings,
            label: "Admin",
            bg: "bg-purple-500/10 dark:bg-purple-500/20",
            iconColor: "text-purple-600 dark:text-purple-400",
            hoverBorder: "hover:border-purple-500/40",
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
            className={`group flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-card border border-border/40 ${action.hoverBorder} hover:shadow-card hover:-translate-y-1 transition-all duration-300`}
          >
            <div className={`w-12 h-12 rounded-2xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-5 h-5 ${action.iconColor}`} />
            </div>
            <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">{action.label}</span>
          </Link>
        );
      })}

      <button
        onClick={onSignOut}
        className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-card border border-border/40 hover:border-destructive/40 hover:shadow-card hover:-translate-y-1 transition-all duration-300"
      >
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <LogOut className="w-5 h-5 text-destructive" />
        </div>
        <span className="text-sm font-semibold text-foreground/80 group-hover:text-destructive transition-colors">Sign Out</span>
      </button>
    </div>
  );
};

export default QuickActions;
