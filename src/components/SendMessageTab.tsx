import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SendMessageTabProps {
  onMessageSent?: () => void;
}

const SendMessageTab = ({ onMessageSent }: SendMessageTabProps) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Error", description: "Please log in to send a message", variant: "destructive" });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const { error } = await supabase.from("contact_messages").insert({
        user_id: user.id,
        name: profile?.full_name || user.email?.split("@")[0] || "User",
        email: user.email,
        mobile: "-",
        subject: subject.trim(),
        message: message.trim(),
        status: "new",
      });

      if (error) throw error;

      toast({
        title: "Message Sent!",
        description: "We'll get back to you soon.",
      });

      setSubject("");
      setMessage("");
      onMessageSent?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Send a Message</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Have a question or need help? Send us a message and we'll respond as soon as possible.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="subject" className="text-sm font-medium text-foreground mb-1.5 block">
            Subject
          </Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What is your message about?"
            className="w-full"
            required
          />
        </div>

        <div>
          <Label htmlFor="message" className="text-sm font-medium text-foreground mb-1.5 block">
            Message
          </Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={5}
            className="w-full resize-none"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={sending || !subject.trim() || !message.trim()}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </div>
  );
};

export default SendMessageTab;
