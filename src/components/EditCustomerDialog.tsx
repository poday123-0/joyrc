import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, X, Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CustomerData {
  user_id: string;
  full_name: string | null;
  mobile_number: string | null;
  email?: string;
  address?: string | null;
}

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerData | null;
  onSuccess: () => void;
}

const EditCustomerDialog = ({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: EditCustomerDialogProps) => {
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");

  useEffect(() => {
    if (customer) {
      setFullName(customer.full_name || "");
      setMobileNumber(customer.mobile_number || "");
      setEmail(customer.email || "");
      setAddress(customer.address || "");
      setOriginalEmail(customer.email || "");
    }
  }, [customer]);

  const handleSave = async () => {
    if (!customer) return;

    if (!fullName.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Update profile information
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          mobile_number: mobileNumber.trim() || null,
          address: address.trim() || null,
        })
        .eq("user_id", customer.user_id);

      if (profileError) throw profileError;

      // If email changed, update auth user
      if (email.trim() !== originalEmail && email.trim()) {
        const response = await supabase.functions.invoke("manage-user", {
          body: {
            action: "update_email",
            user_id: customer.user_id,
            new_email: email.trim(),
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }
      }

      toast({ title: "Customer updated successfully!" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error updating customer",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 gap-0 overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-muted/30">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 pb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.1),transparent_50%)]" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg shadow-primary/10 border border-primary/20">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Edit Customer
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Update customer information
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter customer's full name"
              className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Enter mobile number"
              className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground/60"
            />
            {email !== originalEmail && email.trim() && (
              <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Email will be updated - customer can login with new email
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Address
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter delivery/shipping address"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground/60 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 pt-2 border-t border-border/30 bg-muted/20">
          <button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-xl border border-border/60 bg-background/50 text-foreground font-medium hover:bg-muted/50 transition-all duration-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerDialog;
