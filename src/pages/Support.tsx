import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronDown, ChevronUp, Mail, Phone, MessageCircle, 
  Clock, MapPin, Send, HelpCircle 
} from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { toast } from "@/hooks/use-toast";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is the return policy?",
    answer: "We offer a 30-day return policy for all unused items in their original packaging. Simply contact our support team to initiate a return."
  },
  {
    question: "How long does shipping take?",
    answer: "Standard shipping takes 5-7 business days. Express shipping is available for 2-3 business days delivery. International shipping may take 10-14 business days."
  },
  {
    question: "Do you offer warranties on RC products?",
    answer: "Yes! All our RC products come with a 1-year manufacturer warranty covering defects in materials and workmanship."
  },
  {
    question: "Can I track my order?",
    answer: "Absolutely! Once your order ships, you'll receive a tracking number via email. You can also track your order from your profile page."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and Apple Pay."
  },
  {
    question: "Do you ship internationally?",
    answer: "Yes, we ship to most countries worldwide. Shipping costs and delivery times vary by location."
  },
  {
    question: "How do I care for my RC vehicle?",
    answer: "Keep your RC vehicle clean and dry. Store batteries separately and charge them properly. Regular maintenance like checking screws and cleaning motors will extend its lifespan."
  },
  {
    question: "Can I cancel my order?",
    answer: "Orders can be cancelled within 24 hours of placement if they haven't been shipped yet. Contact our support team immediately for cancellation requests."
  },
];

const Support = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    // Simulate sending message
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24-48 hours.",
    });
    
    setFormData({ name: "", email: "", subject: "", message: "" });
    setSending(false);
  };

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <div className="container max-w-2xl mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-bold text-xl text-foreground">Help & Support</h1>
          <div className="w-10" />
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <a 
            href="mailto:support@rcjoy.com"
            className="glass-card rounded-2xl p-4 text-center hover:bg-white/80 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <p className="font-semibold text-sm text-foreground">Email Us</p>
            <p className="text-xs text-muted-foreground">support@rcjoy.com</p>
          </a>
          <a 
            href="tel:+1234567890"
            className="glass-card rounded-2xl p-4 text-center hover:bg-white/80 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
              <Phone className="w-5 h-5 text-accent" />
            </div>
            <p className="font-semibold text-sm text-foreground">Call Us</p>
            <p className="text-xs text-muted-foreground">+1 (234) 567-890</p>
          </a>
        </div>

        {/* Business Hours */}
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monday - Friday</span>
              <span className="font-medium">9:00 AM - 6:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saturday</span>
              <span className="font-medium">10:00 AM - 4:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sunday</span>
              <span className="font-medium text-coral">Closed</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg text-foreground">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="glass-card rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-foreground pr-4">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg text-foreground">Send Us a Message</h2>
          </div>
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-4 space-y-4">
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
                type="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

        {/* Location */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Our Location</h3>
              <p className="text-sm text-muted-foreground">123 RC Joy Street, Toy City, TC 12345</p>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Support;
