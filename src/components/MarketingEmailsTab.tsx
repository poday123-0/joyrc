import { useState, useEffect } from "react";
import { Send, Users, Mail, Eye, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "./ConfirmDialog";

interface UserEmail {
  id: string;
  email: string;
  full_name: string | null;
}

interface SentEmail {
  id: string;
  subject: string;
  sent_to_count: number;
  created_at: string;
}

const MarketingEmailsTab = () => {
  const [users, setUsers] = useState<UserEmail[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    subject: "",
    html_content: "<h1>Hello!</h1>\n<p>We have exciting news to share with you...</p>",
  });

  useEffect(() => {
    fetchUsers();
    fetchSentEmails();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles with user emails
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      if (error) throw error;

      // Get user emails via edge function
      const { data: adminUsers, error: adminError } = await supabase.functions.invoke("get-admin-users");
      
      if (adminError) {
        console.error("Error fetching admin users:", adminError);
      }

      // Combine profile data with emails
      const userEmails: UserEmail[] = [];
      if (adminUsers?.users) {
        for (const user of adminUsers.users) {
          const profile = profiles?.find((p) => p.user_id === user.id);
          userEmails.push({
            id: user.id,
            email: user.email,
            full_name: profile?.full_name || null,
          });
        }
      }

      setUsers(userEmails);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchSentEmails = async () => {
    const { data } = await supabase
      .from("marketing_emails")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setSentEmails(data);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSend = async () => {
    if (selectedUsers.size === 0) {
      toast({ title: "No Recipients", description: "Please select at least one recipient.", variant: "destructive" });
      return;
    }
    if (!formData.subject.trim() || !formData.html_content.trim()) {
      toast({ title: "Missing Content", description: "Please enter subject and content.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSend = async () => {
    setConfirmOpen(false);
    setSending(true);

    try {
      // Get selected user emails
      const recipientEmails = users
        .filter((u) => selectedUsers.has(u.id))
        .map((u) => u.email);

      // Send via edge function
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "marketing",
          subject: formData.subject,
          html_content: formData.html_content,
          recipient_emails: recipientEmails,
        },
      });

      if (error) throw error;

      // Log the sent email
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("marketing_emails").insert({
          subject: formData.subject,
          html_content: formData.html_content,
          sent_by: user.id,
          sent_to_count: data?.sent || recipientEmails.length,
        });
      }

      toast({
        title: "Emails Sent",
        description: `Successfully sent to ${data?.sent || recipientEmails.length} recipients.`,
      });

      // Reset form
      setFormData({ subject: "", html_content: "<h1>Hello!</h1>\n<p>We have exciting news to share with you...</p>" });
      setSelectedUsers(new Set());
      fetchSentEmails();
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast({ title: "Send Failed", description: error.message, variant: "destructive" });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Marketing Emails</h2>
          <p className="text-xs text-muted-foreground">Send promotional emails to customers</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground"
        >
          <History className="w-3.5 h-3.5" />
          History
        </button>
      </div>

      {/* Sent History */}
      {showHistory && sentEmails.length > 0 && (
        <div className="glass-card rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-medium mb-3">Recently Sent</h3>
          <div className="space-y-2">
            {sentEmails.map((email) => (
              <div key={email.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-foreground">{email.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(email.created_at).toLocaleDateString()} • {email.sent_to_count} recipients
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compose Email */}
      <div className="glass-card rounded-2xl p-4 shadow-soft">
        <h3 className="font-medium mb-4">Compose Email</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              placeholder="Email subject..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">Content (HTML)</label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Edit" : "Preview"}
              </button>
            </div>
            
            {showPreview ? (
              <div
                className="w-full p-4 rounded-xl border border-border bg-white min-h-[150px] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: formData.html_content }}
              />
            ) : (
              <textarea
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm font-mono resize-none h-36"
                placeholder="<h1>Hello!</h1><p>Your email content...</p>"
              />
            )}
          </div>
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
          <button
            onClick={toggleSelectAll}
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            {selectedUsers.size === users.length ? "Deselect All" : "Select All"}
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {users.map((user) => (
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
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </label>
          ))}
        </div>

        {users.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
        )}
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={sending || selectedUsers.size === 0 || !formData.subject.trim()}
        className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {sending ? "Sending..." : `Send to ${selectedUsers.size} Recipient${selectedUsers.size !== 1 ? "s" : ""}`}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send Marketing Email?"
        description={`This will send your email to ${selectedUsers.size} recipient${selectedUsers.size !== 1 ? "s" : ""}. This action cannot be undone.`}
        confirmText={sending ? "Sending..." : "Send Email"}
        onConfirm={confirmSend}
      />
    </div>
  );
};

export default MarketingEmailsTab;
