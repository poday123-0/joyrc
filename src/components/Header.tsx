import { Bell } from "lucide-react";

interface HeaderProps {
  userName?: string;
}

const Header = ({ userName = "Lorem Smith" }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full gradient-cta flex items-center justify-center text-white font-semibold">
          {userName.charAt(0)}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Good Morning</p>
          <p className="font-semibold text-foreground">{userName}</p>
        </div>
      </div>

      <button className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors">
        <Bell className="w-5 h-5 text-foreground" />
      </button>
    </header>
  );
};

export default Header;
