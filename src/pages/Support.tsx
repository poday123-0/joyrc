import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Mail, Phone, Clock, MapPin, Send, HelpCircle, MessageSquare } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNavigation from "@/components/BottomNavigation";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
interface FAQItem {
  id: string;
  title: string;
  content: string;
}
interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}
interface BusinessHours {
  [key: string]: string;
}
const Support = () => {
  const { user } = useAuth();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: "",
    phone: "",
    address: ""
  });
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [loading, setLoading] = useState(true);

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);
  const fetchSupportContent = useCallback(async () => {
    const {
      data
    } = await supabase.from("support_content").select("*").eq("is_active", true).order("sort_order");
    if (data) {
      // Parse FAQs
      const faqItems = data.filter(d => d.type === "faq").map(d => ({
        id: d.id,
        title: d.title,
        content: d.content
      }));
      setFaqs(faqItems);

      // Parse contact info
      const contactData = data.filter(d => d.type === "contact_info");
      setContactInfo({
        email: contactData.find(c => c.title.toLowerCase() === "email")?.content || "",
        phone: contactData.find(c => c.title.toLowerCase() === "phone")?.content || "",
        address: contactData.find(c => c.title.toLowerCase() === "address")?.content || ""
      });

      // Parse business hours - store all with their titles
      const hoursData = data.filter(d => d.type === "business_hours");
      const hoursMap: BusinessHours = {};
      hoursData.forEach(h => {
        hoursMap[h.title] = h.content;
      });
      setBusinessHours(hoursMap);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    fetchSupportContent();

    // Subscribe to realtime changes
    const channel = supabase.channel('support-content-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'support_content'
    }, () => {
      fetchSupportContent();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSupportContent]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.from("contact_messages").insert({
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim() || null,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        user_id: user?.id || null,
      }).select().single();
      
      if (error) throw error;

      // Send email notification to admin
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "new_contact_message",
            customer_name: formData.name.trim(),
            customer_email: formData.email.trim() || null,
            customer_mobile: formData.mobile.trim(),
            subject: formData.subject.trim(),
            message: formData.message.trim(),
          },
        });
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
      }

      toast({
        title: "Message Sent!",
        description: user ? "Check your Messages tab for replies." : "We'll get back to you soon."
      });
      setFormData({
        name: "",
        mobile: "",
        email: user?.email || "",
        subject: "",
        message: ""
      });
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>;
  }
  const hasContactInfo = contactInfo.email || contactInfo.phone || contactInfo.address;
  const hasBusinessHours = Object.keys(businessHours).length > 0;
  return <div className="min-h-screen bg-background lg:pb-0 pb-[48px]">
      <Header />
      
      {/* Hero Section */}
      <section className="gradient-hero py-12 lg:py-16">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">RC Joy Support</h1>
            <p className="text-muted-foreground max-w-md mx-auto">Need help? Start here.</p>
          </div>
        </div>
      </section>

      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Quick Contact Cards */}
        {hasContactInfo && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {contactInfo.email && <a href={`mailto:${contactInfo.email}`} className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-card transition-all group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Email Us</p>
                  <p className="text-sm text-muted-foreground truncate">{contactInfo.email}</p>
                </div>
              </a>}
            {contactInfo.phone && <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-card transition-all group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Call Us</p>
                  <p className="text-sm text-muted-foreground">{contactInfo.phone}</p>
                </div>
              </a>}
            {contactInfo.address && <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Visit Us</p>
                  <p className="text-sm text-muted-foreground truncate">{contactInfo.address}</p>
                </div>
              </div>}
          </div>}

        <div className="lg:flex lg:gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Business Hours - Mobile */}
            {hasBusinessHours && <Card className="lg:hidden glass-card border-0 shadow-soft">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Business Hours</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(businessHours).map(([title, hours]) => <div key={title} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{title}</span>
                      <span className={`font-medium ${hours.toLowerCase() === "closed" ? "text-destructive" : "text-foreground"}`}>
                        {hours}
                      </span>
                    </div>)}
                </CardContent>
              </Card>}

            {/* FAQ Section */}
            {faqs.length > 0 && <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-3">
                  {faqs.map(faq => <Card key={faq.id} className="glass-card border-0 shadow-soft overflow-hidden">
                      <button onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors">
                        <span className="font-medium text-foreground pr-4">{faq.title}</span>
                        <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 transition-transform ${expandedFaq === faq.id ? "rotate-180" : ""}`}>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                      {expandedFaq === faq.id && <div className="px-4 pb-4 border-t border-border/50">
                          <p className="text-sm text-muted-foreground pt-4 whitespace-pre-line">{faq.content}</p>
                        </div>}
                    </Card>)}
                </div>
              </div>}

            {/* Contact Form */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Send Us a Message</h2>
              </div>
              <Card className="glass-card border-0 shadow-soft">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name</Label>
                        <Input id="name" type="text" placeholder="Enter your name" value={formData.name} onChange={e => setFormData({
                        ...formData,
                        name: e.target.value
                      })} className="bg-card border-border focus-visible:ring-accent" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number</Label>
                        <Input id="mobile" type="tel" placeholder="Enter your mobile number" value={formData.mobile} onChange={e => setFormData({
                        ...formData,
                        mobile: e.target.value
                      })} className="bg-card border-border focus-visible:ring-accent" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address (for reply notifications)</Label>
                      <Input id="email" type="email" placeholder="Enter your email (optional)" value={formData.email} onChange={e => setFormData({
                      ...formData,
                      email: e.target.value
                    })} className="bg-card border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" type="text" placeholder="What is this about?" value={formData.subject} onChange={e => setFormData({
                      ...formData,
                      subject: e.target.value
                    })} className="bg-card border-border focus-visible:ring-accent" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Your Message</Label>
                      <Textarea id="message" placeholder="Tell us how we can help..." value={formData.message} onChange={e => setFormData({
                      ...formData,
                      message: e.target.value
                    })} className="bg-card border-border focus-visible:ring-accent min-h-[120px] resize-none" required />
                    </div>
                    <Button type="submit" disabled={sending} className="w-full bg-primary text-primary-foreground font-semibold h-12 rounded-xl hover:bg-primary/90">
                      <Send className="w-4 h-4 mr-2" />
                      {sending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="sticky top-20 space-y-6">
              {/* Business Hours */}
              {hasBusinessHours && <Card className="glass-card border-0 shadow-soft">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Business Hours</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(businessHours).map(([title, hours]) => <div key={title} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{title}</span>
                        <span className={`font-medium ${hours.toLowerCase() === "closed" ? "text-destructive" : "text-foreground"}`}>
                          {hours}
                        </span>
                      </div>)}
                  </CardContent>
                </Card>}

              {/* Location Card */}
              {contactInfo.address && <Card className="glass-card border-0 shadow-soft">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Our Location</h4>
                        <p className="text-sm text-muted-foreground">{contactInfo.address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>}

              {/* Quick Help */}
              <Card className="glass-card border-0 shadow-soft">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Need Quick Help?</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Our team is ready to assist you
                  </p>
                  {contactInfo.phone && <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Phone className="w-4 h-4" />
                      Call Now
                    </a>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <BottomNavigation />
    </div>;
};
export default Support;