import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Phone, FileText, Building2, Upload, Clock, CheckCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";

interface BankSetting {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string | null;
}

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ address: "", phone: "", notes: "" });
  const [bankSettings, setBankSettings] = useState<BankSetting[]>([]);
  const [placing, setPlacing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBankSettings();
  }, []);

  const fetchBankSettings = async () => {
    const { data } = await supabase.from("bank_settings").select("*").eq("is_active", true);
    if (data) setBankSettings(data);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (items.length === 0) { toast({ title: "Cart is empty", variant: "destructive" }); return; }

    setPlacing(true);
    try {
      let receiptUrl = null;
      if (receiptFile) {
        setUploading(true);
        const fileName = `receipts/${Date.now()}-${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, receiptFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
        receiptUrl = urlData.publicUrl;
        setUploading(false);
      }

      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id,
        total_amount: totalPrice,
        shipping_address: formData.address.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim() || null,
        status: "pending",
        payment_status: receiptUrl ? "uploaded" : "pending",
        payment_method: "bank_transfer",
        receipt_url: receiptUrl,
      }).select().single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
      }));

      await supabase.from("order_items").insert(orderItems);

      clearCart();
      toast({ title: "🎉 Order Placed!", description: receiptUrl ? "We'll confirm your payment soon." : "Please complete payment and upload receipt." });
      navigate("/profile");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground mb-4">Your cart is empty</p>
        <Link to="/" className="px-6 py-3 rounded-full gradient-cta text-white font-medium">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-32 lg:pb-8">
      <div className="container max-w-5xl mx-auto px-4 lg:px-8 pt-4">
        <div className="flex items-center justify-between mb-6">
          <Link to="/cart" className="w-10 h-10 rounded-full glass-card flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-foreground text-lg lg:text-xl">Checkout</h1>
          <div className="w-10" />
        </div>

        <div className="lg:flex lg:gap-8">
          {/* Main Form Area */}
          <div className="flex-1 space-y-4">
            {/* Order Summary */}
            <div className="glass-card rounded-2xl p-4 lg:p-6 shadow-soft">
              <h2 className="font-semibold text-foreground mb-3 lg:text-lg">Order Summary</h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm lg:text-base">
                    <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                    <span className="font-medium">{formatMVR(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold lg:text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatMVR(totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            {bankSettings.length > 0 && (
              <div className="glass-card rounded-2xl p-4 lg:p-6 shadow-soft">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground lg:text-lg">Bank Transfer</h2>
                </div>
                <p className="text-xs lg:text-sm text-muted-foreground mb-3">Transfer {formatMVR(totalPrice)} to:</p>
                <div className="grid gap-2 lg:grid-cols-2">
                  {bankSettings.map((bank) => (
                    <div key={bank.id} className="bg-muted/50 rounded-xl p-3 lg:p-4">
                      <p className="font-semibold text-foreground">{bank.bank_name}</p>
                      <p className="text-sm text-muted-foreground">{bank.account_name}</p>
                      <p className="text-sm font-mono text-foreground">{bank.account_number}</p>
                      {bank.branch && <p className="text-xs text-muted-foreground">Branch: {bank.branch}</p>}
                    </div>
                  ))}
                </div>
                
                {/* Receipt Upload */}
                <label className="mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                  <Upload className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary">
                    {receiptFile ? receiptFile.name : "Upload Payment Receipt"}
                  </span>
                  <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
                {receiptFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-mint">
                    <CheckCircle className="w-4 h-4" /> Receipt ready to upload
                  </div>
                )}
              </div>
            )}

            {/* Shipping Form */}
            <form onSubmit={handlePlaceOrder} className="glass-card rounded-2xl p-4 lg:p-6 shadow-soft space-y-3 lg:space-y-4">
              <h2 className="font-semibold text-foreground mb-2 lg:text-lg">Shipping Details</h2>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" /> Address
                </label>
                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Full shipping address" className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent resize-none h-20" required />
              </div>
              <div className="lg:grid lg:grid-cols-2 lg:gap-4">
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4" /> Phone
                  </label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+960 xxx xxxx" className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent" required />
                </div>
                <div className="mt-3 lg:mt-0">
                  <label className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4" /> Notes (optional)
                  </label>
                  <input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Special instructions..." className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              
              {/* Desktop Place Order Button */}
              <button type="submit" disabled={placing || uploading} className="hidden lg:flex w-full py-4 rounded-full gradient-cta text-white font-semibold shadow-elevated disabled:opacity-50 items-center justify-center gap-2 mt-6">
                {placing ? "Placing Order..." : (
                  <>
                    <Clock className="w-5 h-5" />
                    Place Order - {formatMVR(totalPrice)}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Desktop Sidebar Summary */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="glass-card rounded-2xl p-6 shadow-soft sticky top-4">
              <h2 className="font-semibold text-lg text-foreground mb-4">Payment Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatMVR(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-mint font-medium">Free</span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">{formatMVR(totalPrice)}</span>
                </div>
              </div>
              {!receiptFile && bankSettings.length > 0 && (
                <p className="text-xs text-center text-muted-foreground mt-4">
                  You can upload receipt later from your profile
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom action bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl">
        <div className="container max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">{formatMVR(totalPrice)}</span>
          </div>
          <button onClick={handlePlaceOrder} disabled={placing || uploading} className="w-full py-4 rounded-full gradient-cta text-white font-semibold shadow-elevated disabled:opacity-50 flex items-center justify-center gap-2">
            {placing ? "Placing Order..." : (
              <>
                <Clock className="w-5 h-5" />
                Place Order
              </>
            )}
          </button>
          {!receiptFile && bankSettings.length > 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              You can upload receipt later from your profile
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
