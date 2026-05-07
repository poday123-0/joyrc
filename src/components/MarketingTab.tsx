import { useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import MarketingEmailsTab from "@/components/MarketingEmailsTab";
import MarketingSmsTab from "@/components/MarketingSmsTab";

type Channel = "email" | "sms";

const MarketingTab = () => {
  const [channel, setChannel] = useState<Channel>("email");

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-1.5 shadow-soft flex gap-1">
        <button
          onClick={() => setChannel("email")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            channel === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Mail className="w-4 h-4" /> Email
        </button>
        <button
          onClick={() => setChannel("sms")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            channel === "sms" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <MessageSquare className="w-4 h-4" /> SMS
        </button>
      </div>

      {channel === "email" ? <MarketingEmailsTab /> : <MarketingSmsTab />}
    </div>
  );
};

export default MarketingTab;
