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
    <div className="bg-gradient-to-br from-card via-card to-muted/30 border border-border/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 shadow-lg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-20 sm:w-24 h-20 sm:h-24 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative flex flex-row lg:flex-col items-center gap-4 lg:gap-0">
        <div className="relative lg:mb-5 flex-shrink-0">
          <Avatar className="w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 ring-4 ring-primary/20 ring-offset-2 sm:ring-offset-4 ring-offset-background shadow-xl">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={fullName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl sm:text-2xl lg:text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isAdmin && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-background">
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-primary-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex flex-col lg:items-center min-w-0">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground lg:text-center truncate">
            {fullName || "User"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground lg:text-center break-all">
            {email}
          </p>
          
          {isAdmin && (
            <div className="mt-2 lg:mt-4 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 self-start lg:self-center">
              <span className="text-[10px] sm:text-xs font-semibold text-primary tracking-wide uppercase">
                Administrator
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
