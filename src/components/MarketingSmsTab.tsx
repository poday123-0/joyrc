import { useState, useEffect, useMemo } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Send, Users, History, Search, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "./ConfirmDialog";
import { Input } from "./ui/input";

interface UserPhone {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
}

interface SentSms {
  id: string;
  message: string;
  sent_to_count: number;
  created_at: string;
}

const MAX_SMS_LENGTH = 480; // ~3 SMS segments

const MarketingSmsTab = () => {
  const [users, setUsers] = useState<UserPhone[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sentSms, setSentSms] = useState<SentSms[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchSentSms();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: customerData, error } = await supabase.functions.invoke("get-customer-users", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;

      const list: UserPhone[] = (customerData?.customers || [])
        .filter((c: any) => c.mobile_number && c.mobile_number.trim())
        .map((c: any) => ({
          id: c.user_id,
          full_name: c.full_name,
          email: c.email,
          mobile_number: c.mobile_number,
        }));
      setUsers(list);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load customers", variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchSentSms = async () => {
    const { data } = await supabase
      .from("marketing_sms")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setSentSms(data as SentSms[]);
  };

  useRealtimeSubscription("marketing_sms", fetchSentSms, "rt-marketing-sms");

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.mobile_number?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const toggleUser = (id: string) => {
    const next = new Set(selectedUsers);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedUsers(next);
  };

  const selectAll = () => setSelectedUsers(new Set(users.map((u) => u.id)));
  const clearAll = () => setSelectedUsers(new Set());

  const toggleFiltered = () => {
    const ids = filteredUsers.map((u) => u.id);
    const allSelected = ids.every((id) => selectedUsers.has(id));
    const next = new Set(selectedUsers);
    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelectedUsers(next);
  };

  const handleSend = () => {
    if (selectedUsers.size === 0) {
      toast({ title: "No Recipients", description: "Select at least one recipient.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Empty Message", description: "Please enter a message.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const recipients = users
        .filter((u) => selectedUsers.has(u.id))
        .map((u) => u.mobile_number)
        .filter(Boolean) as string[];

      const { data, error } = await supabase.functions.invoke("send-marketing-sms", {
        body: { message, recipients },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("marketing_sms").insert({
          message,
          sent_by: user.id,
          sent_to_count: data?.sent || recipients.length,
        });
      }

      const failed = data?.failed || 0;
      toast({
        title: "SMS Sent",
        description: `Sent to ${data?.sent || recipients.length} recipients${failed ? `, ${failed} failed` : ""}.`,
      });
      setMessage("");
      setSelectedUsers(new Set());
      fetchSentSms();
    } catch (e: any) {
      toast({ title: "Send Failed", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const charsLeft = MAX_SMS_LENGTH - message.length;
  const segments = Math.max(1, Math.ceil(message.length / 160));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground"
        >
          <History className="w-3.5 h-3.5" />
          History
        </button>
      </div>

      {showHistory && sentSms.length > 0 && (
        <div className="glass-card rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-medium mb-3">Recently Sent</h3>
          <div className="space-y-2">
            {sentSms.map((s) => (
              <div key={s.id} className="text-sm py-2 border-b border-border last:border-0">
                <p className="text-foreground line-clamp-2">{s.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(s.created_at).toLocaleString()} • {s.sent_to_count} recipients
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compose */}
      <div className="glass-card rounded-2xl p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Compose SMS</h3>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_SMS_LENGTH))}
          placeholder="Type your marketing message..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none h-32"
        />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{segments} SMS segment{segments !== 1 ? "s" : ""}</span>
          <span>{charsLeft} characters left</span>
        </div>
      </div>

      {/* Recipients */}
      <div className="glass-card rounded-2xl p-4 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Recipients</h3>
            <span className="text-xs text-muted-foreground">
              ({selectedUsers.size} of {users.length} selected)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-xs text-primary hover:text-primary/80 font-medium">
              Select All
            </button>
            <span className="text-muted-foreground">|</span>
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground font-medium">
              Clear
            </button>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {searchQuery && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} customers
            </span>
            <button onClick={toggleFiltered} className="text-xs text-primary hover:text-primary/80 font-medium">
              {filteredUsers.every((u) => selectedUsers.has(u.id)) ? "Deselect Filtered" : "Select Filtered"}
            </button>
          </div>
        )}

        <div className="max-h-60 overflow-y-auto space-y-1">
          {filteredUsers.map((user) => (
            <label
              key={user.id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                selectedUsers.has(user.id) ? "bg-primary/10" : "hover:bg-muted/50"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedUsers.has(user.id)}
                onChange={() => toggleUser(user.id)}
                className="w-4 h-4 rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.full_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.mobile_number} {user.email && `• ${user.email}`}
                </p>
              </div>
            </label>
          ))}
        </div>

        {users.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No customers with mobile numbers found
          </p>
        )}
        {users.length > 0 && filteredUsers.length === 0 && searchQuery && (
          <p className="text-center text-sm text-muted-foreground py-4">No customers match your search</p>
        )}
      </div>

      <button
        onClick={handleSend}
        disabled={sending || selectedUsers.size === 0 || !message.trim()}
        className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {sending ? "Sending..." : `Send to ${selectedUsers.size} Recipient${selectedUsers.size !== 1 ? "s" : ""}`}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send Marketing SMS?"
        description={`This will send your SMS to ${selectedUsers.size} recipient${selectedUsers.size !== 1 ? "s" : ""}. Standard SMS charges apply.`}
        confirmText={sending ? "Sending..." : "Send SMS"}
        onConfirm={confirmSend}
      />
    </div>
  );
};

export default MarketingSmsTab;
