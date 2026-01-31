import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileCardProps {
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
}

const ProfileCard = ({ fullName, email, avatarUrl, isAdmin }: ProfileCardProps) => {
  const initials = (fullName || email || "U").charAt(0).toUpperCase();
  
  return (
    <div className="bg-gradient-to-br from-card via-card to-muted/30 border border-border/50 rounded-3xl p-8 shadow-lg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative flex flex-col items-center">
        <div className="relative mb-5">
          <Avatar className="w-28 h-28 ring-4 ring-primary/20 ring-offset-4 ring-offset-background shadow-xl">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={fullName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isAdmin && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-background">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-bold text-foreground text-center mb-1">
          {fullName || "User"}
        </h2>
        <p className="text-sm text-muted-foreground text-center break-all max-w-full">
          {email}
        </p>
        
        {isAdmin && (
          <div className="mt-4 px-5 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">
              Administrator
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
