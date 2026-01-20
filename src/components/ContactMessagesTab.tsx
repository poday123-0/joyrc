import { useState, useEffect } from "react";
import { Phone, Clock, MessageSquare, CheckCircle, Eye, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ConfirmDialog from "@/components/ConfirmDialog";

interface ContactMessage {
  id: string;
  name: string;
  mobile: string;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const ContactMessagesTab = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleViewMessage = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.admin_notes || "");

    // Mark as read if new
    if (msg.status === "new") {
      await supabase
        .from("contact_messages")
        .update({ status: "read" })
        .eq("id", msg.id);
      fetchMessages();
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedMessage) return;
    setSaving(true);

    const { error } = await supabase
      .from("contact_messages")
      .update({ status, admin_notes: adminNotes.trim() || null })
      .eq("id", selectedMessage.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Message marked as ${status}.` });
      setSelectedMessage(null);
      fetchMessages();
    }
    setSaving(false);
  };

  const handleDeleteClick = (id: string) => {
    setMessageToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;

    const { error } = await supabase.from("contact_messages").delete().eq("id", messageToDelete);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message Deleted", description: "Contact message has been removed." });
      fetchMessages();
    }
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-primary text-primary-foreground";
      case "read": return "bg-blue-100 text-blue-700";
      case "replied": return "bg-green-100 text-green-700";
      case "closed": return "bg-gray-100 text-gray-700";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const newCount = messages.filter((m) => m.status === "new").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground">Contact Messages</h2>
          {newCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {newCount} new
            </span>
          )}
        </div>
      </div>

      {selectedMessage && (
        <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Message Details</h3>
            <button onClick={() => setSelectedMessage(null)}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{selectedMessage.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mobile</p>
                <a 
                  href={`tel:${selectedMessage.mobile}`}
                  className="font-medium text-primary flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  {selectedMessage.mobile}
                </a>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-medium">{selectedMessage.subject}</p>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground">Message</p>
              <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedMessage.message}</p>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this message..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none h-20"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateStatus("replied")}
                disabled={saving}
                className="flex-1 py-2 rounded-full bg-green-500 text-white text-sm font-medium disabled:opacity-50"
              >
                Mark as Replied
              </button>
              <button
                onClick={() => handleUpdateStatus("closed")}
                disabled={saving}
                className="flex-1 py-2 rounded-full bg-gray-500 text-white text-sm font-medium disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="glass-card rounded-xl p-3 shadow-soft"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium text-foreground text-sm">{msg.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(msg.status)}`}>
                      {msg.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 truncate">{msg.subject}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {msg.mobile}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(msg.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 ml-auto sm:ml-0">
                <button
                  onClick={() => handleViewMessage(msg)}
                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Eye className="w-4 h-4 sm:w-3 sm:h-3" />
                </button>
                <a
                  href={`tel:${msg.mobile}`}
                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200"
                >
                  <Phone className="w-4 h-4 sm:w-3 sm:h-3 text-green-600" />
                </a>
                <button
                  onClick={() => handleDeleteClick(msg.id)}
                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                >
                  <Trash2 className="w-4 h-4 sm:w-3 sm:h-3 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No contact messages yet.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Message?"
        description="This will permanently remove this contact message."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ContactMessagesTab;
