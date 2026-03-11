import { User, Package, MessageSquare } from "lucide-react";

type TabType = "profile" | "orders" | "messages";

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isAdmin: boolean;
}

const ProfileTabs = ({ activeTab, onTabChange, isAdmin }: ProfileTabsProps) => {
  if (isAdmin) {
    return (
      <div className="mb-8">
        <h3 className="font-bold text-xl text-foreground">Account Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Manage orders from the Admin Panel</p>
      </div>
    );
  }

  const tabs = [
    { id: "profile" as const, icon: User, label: "Profile" },
    { id: "orders" as const, icon: Package, label: "Orders" },
    { id: "messages" as const, icon: MessageSquare, label: "Messages" },
  ];

  return (
    <div className="flex gap-1.5 sm:gap-2 mb-5 sm:mb-8 p-1 sm:p-1.5 bg-muted/40 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-border/30 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 md:flex-none md:px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2.5 whitespace-nowrap ${
              isActive
                ? "bg-card text-foreground shadow-md border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ProfileTabs;
