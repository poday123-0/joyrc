import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronDown, ChevronUp, Mail, Phone, 
  Clock, MapPin, Send, HelpCircle 
} from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  weekdays: string;
  saturday: string;
  sunday: string;
}

const Support = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({ email: "", phone: "", address: "" });
  const [businessHours, setBusinessHours] = useState<BusinessHours>({ weekdays: "", saturday: "", sunday: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupportContent = async () => {
      const { data } = await supabase
        .from("support_content")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (data) {
        // Parse FAQs
        const faqItems = data.filter(d => d.type === "faq").map(d => ({
          id: d.id,
          title: d.title,
          content: d.content,
        }));
        setFaqs(faqItems);

        // Parse contact info
        const contactData = data.filter(d => d.type === "contact_info");
        setContactInfo({
          email: contactData.find(c => c.title === "email")?.content || "",
          phone: contactData.find(c => c.title === "phone")?.content || "",
          address: contactData.find(c => c.title === "address")?.content || "",
        });

        // Parse business hours
        const hoursData = data.filter(d => d.type === "business_hours");
        setBusinessHours({
          weekdays: hoursData.find(h => h.title === "weekdays")?.content || "",
          saturday: hoursData.find(h => h.title === "saturday")?.content || "",
          sunday: hoursData.find(h => h.title === "sunday")?.content || "",
        });
      }
      setLoading(false);
    };

    fetchSupportContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      if (error) throw error;

      toast({
        title: "Message Sent!",
        description: "We'll get back to you soon. You can expect a call from us.",
      });
      
      setFormData({ name: "", mobile: "", subject: "", message: "" });
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-24 lg:pb-8">
      <div className="container max-w-5xl mx-auto px-4 lg:px-8 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-bold text-xl lg:text-2xl text-foreground">Help & Support</h1>
          <div className="w-10" />
        </div>

        <div className="lg:flex lg:gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Quick Contact Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {contactInfo.email && (
                <a 
                  href={`mailto:${contactInfo.email}`}
                  className="glass-card rounded-2xl p-4 text-center hover:bg-white/80 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Email Us</p>
                  <p className="text-xs text-muted-foreground truncate">{contactInfo.email}</p>
                </a>
              )}
              {contactInfo.phone && (
                <a 
                  href={`tel:${contactInfo.phone}`}
                  className="glass-card rounded-2xl p-4 text-center hover:bg-white/80 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                    <Phone className="w-5 h-5 text-accent" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Call Us</p>
                  <p className="text-xs text-muted-foreground">{contactInfo.phone}</p>
                </a>
              )}
              {contactInfo.address && (
                <a 
                  href="#"
                  className="glass-card rounded-2xl p-4 text-center hover:bg-white/80 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-mint/30 flex items-center justify-center mx-auto mb-2">
                    <MapPin className="w-5 h-5 text-foreground" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Visit Us</p>
                  <p className="text-xs text-muted-foreground truncate">{contactInfo.address}</p>
                </a>
              )}
              {(businessHours.weekdays || businessHours.saturday || businessHours.sunday) && (
                <div className="glass-card rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-5 h-5 text-gold" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Hours</p>
                  <p className="text-xs text-muted-foreground">{businessHours.weekdays || "Check below"}</p>
                </div>
              )}
            </div>

            {/* Business Hours - Desktop sidebar content on mobile */}
            <div className="lg:hidden">
              {(businessHours.weekdays || businessHours.saturday || businessHours.sunday) && (
                <div className="glass-card rounded-2xl p-4 mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-mint/30 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Business Hours</h3>
                      <p className="text-xs text-muted-foreground">We're here to help!</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {businessHours.weekdays && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monday - Friday</span>
                        <span className="font-medium">{businessHours.weekdays}</span>
                      </div>
                    )}
                    {businessHours.saturday && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Saturday</span>
                        <span className="font-medium">{businessHours.saturday}</span>
                      </div>
                    )}
                    {businessHours.sunday && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sunday</span>
                        <span className={`font-medium ${businessHours.sunday.toLowerCase() === "closed" ? "text-coral" : ""}`}>
                          {businessHours.sunday}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FAQ Section */}
            {faqs.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-lg lg:text-xl text-foreground">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div key={faq.id} className="glass-card rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <span className="font-medium text-foreground pr-4">{faq.title}</span>
                        {expandedFaq === index ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                      {expandedFaq === index && (
                        <div className="px-4 pb-4">
                          <p className="text-sm text-muted-foreground">{faq.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Form */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg lg:text-xl text-foreground">Contact Us</h2>
              </div>
              <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-4 lg:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  required
                />
                <textarea
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none h-32"
                  required
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 rounded-full gradient-cta text-white font-medium shadow-soft disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="glass-card rounded-2xl p-6 shadow-soft sticky top-4">
              <h3 className="font-semibold text-lg text-foreground mb-4">Business Hours</h3>
              <div className="space-y-3 text-sm mb-6">
                {businessHours.weekdays && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mon - Fri</span>
                    <span className="font-medium">{businessHours.weekdays}</span>
                  </div>
                )}
                {businessHours.saturday && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saturday</span>
                    <span className="font-medium">{businessHours.saturday}</span>
                  </div>
                )}
                {businessHours.sunday && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sunday</span>
                    <span className={`font-medium ${businessHours.sunday.toLowerCase() === "closed" ? "text-coral" : ""}`}>
                      {businessHours.sunday}
                    </span>
                  </div>
                )}
              </div>

              {contactInfo.address && (
                <div className="pt-6 border-t border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Our Location</h4>
                      <p className="text-sm text-muted-foreground mt-1">{contactInfo.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Support;
