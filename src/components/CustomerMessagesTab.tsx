import { useState, useEffect } from "react";
import { MessageSquare, Clock, Send, ChevronDown, ChevronUp, User, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MessageReply {
  id: string;
  reply_text: string;
  is_admin_reply: boolean;
  created_at: string;
  replied_by: string | null;
}

interface ContactMessage {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  replies?: MessageReply[];
}

const CustomerMessagesTab = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id, subject, message, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
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
      setMessages(messagesWithReplies);
    } else {
      setMessages([]);
    }
    
    setLoading(false);
  };

  const handleSendReply = async (messageId: string, messageSubject: string) => {
    if (!replyText.trim() || !user) return;
    
    setSending(true);
    
    try {
      const { error } = await supabase
        .from("message_replies")
        .insert({
          message_id: messageId,
          reply_text: replyText.trim(),
          replied_by: user.id,
          is_admin_reply: false,
        });

      if (error) throw error;

      // Update message status
      await supabase
        .from("contact_messages")
        .update({ status: "read" })
        .eq("id", messageId);

      // Notify admin about customer reply
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "new_contact_message",
            customer_name: user.email?.split("@")[0] || "Customer",
            customer_email: user.email,
            customer_mobile: "-",
            subject: `Re: ${messageSubject}`,
            message: replyText.trim(),
          },
        });
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
      }

      toast({ title: "Reply sent!", description: "Your message has been sent." });
      setReplyText("");
      fetchMessages();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-primary text-primary-foreground";
      case "read": return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
      case "replied": return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
      case "closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-2">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Use the "Send Message" tab to contact our support team
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">My Conversations</h3>
        </div>
        <p className="text-xs text-muted-foreground">Click a message to view conversation</p>
      </div>

      {messages.map((msg) => {
        const isExpanded = expandedMessage === msg.id;
        const hasReplies = msg.replies && msg.replies.length > 0;

        return (
          <div
            key={msg.id}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpandedMessage(isExpanded ? null : msg.id)}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-medium text-foreground text-sm truncate">{msg.subject}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(msg.status)}`}>
                    {msg.status}
                  </span>
                  {hasReplies && (
                    <span className="text-xs text-primary font-medium">
                      {msg.replies?.length} {msg.replies?.length === 1 ? "reply" : "replies"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(new Date(msg.created_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border/50">
                {/* Original Message */}
                <div className="py-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">You</p>
                      <div className="bg-primary/5 rounded-lg p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {msg.replies && msg.replies.length > 0 && (
                  <div className="space-y-3 border-t border-border/50 pt-4">
                    {msg.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
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
                            <p className="text-xs font-medium text-foreground">
                              {reply.is_admin_reply ? "Support Team" : "You"}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(reply.created_at), "MMM d 'at' h:mm a")}
                            </span>
                          </div>
                          <div className={`rounded-lg p-3 ${
                            reply.is_admin_reply ? "bg-primary/10" : "bg-muted/50"
                          }`}>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{reply.reply_text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                {msg.status !== "closed" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                    <input
                      type="text"
                      value={expandedMessage === msg.id ? replyText : ""}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(msg.id, msg.subject);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleSendReply(msg.id, msg.subject)}
                      disabled={sending || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {msg.status === "closed" && (
                  <div className="mt-4 pt-4 border-t border-border/50 text-center">
                    <p className="text-sm text-muted-foreground">This conversation has been closed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CustomerMessagesTab;
