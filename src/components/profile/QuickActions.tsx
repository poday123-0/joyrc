import { Link } from "react-router-dom";
import { ShoppingBag, Settings, LogOut, ChevronRight } from "lucide-react";

interface QuickActionsProps {
  isAdmin: boolean;
  onSignOut: () => void;
}

const QuickActions = ({ isAdmin, onSignOut }: QuickActionsProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-4">
        Quick Actions
      </h3>
      
      <Link 
        to="/cart" 
        className="group flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/40 hover:bg-card transition-all duration-300 shadow-sm hover:shadow-md"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
          <ShoppingBag className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm">My Cart</h4>
          <p className="text-xs text-muted-foreground mt-0.5">View your shopping cart</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
      </Link>

      {isAdmin && (
        <Link 
          to="/admin" 
          className="group flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/40 hover:bg-card transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm">Admin Panel</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Manage products & settings</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
        </Link>
      )}

      <button
        onClick={onSignOut}
        className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 hover:border-destructive/40 hover:bg-destructive/5 transition-all duration-300 shadow-sm hover:shadow-md"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 flex items-center justify-center group-hover:from-destructive/20 group-hover:to-destructive/10 transition-all duration-300">
          <LogOut className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <h4 className="font-semibold text-foreground text-sm">Sign Out</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Log out of your account</p>
        </div>
      </button>
    </div>
  );
};

export default QuickActions;
