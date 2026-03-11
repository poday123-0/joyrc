import { useState, useEffect } from "react";
import { Phone, Clock, MessageSquare, Eye, X, Trash2, Send, Shield, User, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ConfirmDialog from "@/components/ConfirmDialog";

interface MessageReply {
  id: string;
  reply_text: string;
  is_admin_reply: boolean;
  created_at: string;
  replied_by: string | null;
}

interface ContactMessage {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_id: string | null;
  replies?: MessageReply[];
}

const ContactMessagesTab = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    // Fetch replies for each message
    if (data && data.length > 0) {
      const messagesWithReplies = await Promise.all(
        data.map(async (msg) => {
          const { data: replies } = await supabase
            .from("message_replies")
            .select("*")
            .eq("message_id", msg.id)
            .order("created_at", { ascending: true });
          
          return { ...msg, replies: replies || [] };
        })
      );
      setMessages(messagesWithReplies as ContactMessage[]);
    } else {
      setMessages([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleViewMessage = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.admin_notes || "");
    setReplyText("");

    if (msg.status === "new") {
      await supabase
        .from("contact_messages")
        .update({ status: "read" })
        .eq("id", msg.id);
      fetchMessages();
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || !user) return;
    setSendingReply(true);

    try {
      // Insert the reply
      const { error: replyError } = await supabase
        .from("message_replies")
        .insert({
          message_id: selectedMessage.id,
          reply_text: replyText.trim(),
          replied_by: user.id,
          is_admin_reply: true,
        });

      if (replyError) throw replyError;

      // Update message status
      await supabase
        .from("contact_messages")
        .update({ status: "replied", admin_notes: adminNotes.trim() || null })
        .eq("id", selectedMessage.id);

      // Send email notification if customer has email
      if (selectedMessage.email) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "customer_reply_notification",
              recipient_email: selectedMessage.email,
              customer_name: selectedMessage.name,
              reply_text: replyText.trim(),
              subject: selectedMessage.subject,
            },
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }

      toast({ title: "Reply Sent!", description: "Your reply has been sent to the customer." });
      setReplyText("");
      setSelectedMessage(null);
      fetchMessages();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSendingReply(false);
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
            
            {/* Conversation Thread */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Conversation</p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto p-3 bg-muted/30 rounded-lg">
                {/* Original Message */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{selectedMessage.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(selectedMessage.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <div className="bg-card rounded-lg p-2.5 text-sm">
                      {selectedMessage.message}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {selectedMessage.replies?.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      reply.is_admin_reply ? "bg-primary/20" : "bg-muted"
                    }`}>
                      {reply.is_admin_reply ? (
                        <Shield className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {reply.is_admin_reply ? "Support Team" : selectedMessage.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(reply.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className={`rounded-lg p-2.5 text-sm ${
                        reply.is_admin_reply ? "bg-primary/10" : "bg-card"
                      }`}>
                        {reply.reply_text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Input */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Send Reply</p>
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to the customer..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none h-20"
                />
              </div>
              <button
                onClick={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
                className="mt-2 w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sendingReply ? "Sending..." : "Send Reply & Notify Customer"}
              </button>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Internal Notes</p>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes (not visible to customer)..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none h-16"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateStatus("closed")}
                disabled={saving}
                className="flex-1 py-2 rounded-full bg-gray-500 text-white text-sm font-medium disabled:opacity-50"
              >
                Close Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {messages.map((msg) => {
          const hasReplies = msg.replies && msg.replies.length > 0;
          const isExpanded = expandedId === msg.id;

          return (
            <div key={msg.id} className="glass-card rounded-xl shadow-soft overflow-hidden">
              <div className="p-3 flex flex-col sm:flex-row sm:items-start gap-3">
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
                      {hasReplies && (
                        <span className="text-xs text-primary font-medium">
                          {msg.replies?.length} {msg.replies?.length === 1 ? "reply" : "replies"}
                        </span>
                      )}
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
                  {hasReplies && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 sm:w-3 sm:h-3" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-3 sm:h-3" />
                      )}
                    </button>
                  )}
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

              {/* Expanded Replies Preview */}
              {isExpanded && hasReplies && (
                <div className="px-4 pb-3 border-t border-border/50">
                  <div className="space-y-2 pt-3">
                    {msg.replies?.slice(0, 3).map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2 text-sm">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          reply.is_admin_reply ? "bg-primary/20" : "bg-muted"
                        }`}>
                          {reply.is_admin_reply ? (
                            <Shield className="w-3 h-3 text-primary" />
                          ) : (
                            <User className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground">
                            {reply.is_admin_reply ? "Support" : msg.name} • {format(new Date(reply.created_at), "MMM d")}
                          </span>
                          <p className="text-xs text-foreground truncate">{reply.reply_text}</p>
                        </div>
                      </div>
                    ))}
                    {msg.replies && msg.replies.length > 3 && (
                      <button
                        onClick={() => handleViewMessage(msg)}
                        className="text-xs text-primary hover:underline"
                      >
                        View all {msg.replies.length} replies
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

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
        description="This will permanently remove this contact message and all replies."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ContactMessagesTab;
