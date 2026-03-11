import { useState } from "react";
import { User, Mail, Save, Phone, MapPin, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EditProfileFormProps {
  fullName: string;
  mobileNumber: string;
  email: string;
  address: string;
  saving: boolean;
  onFullNameChange: (value: string) => void;
  onMobileNumberChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onSave: () => void;
}

const EditProfileForm = ({
  fullName,
  mobileNumber,
  email,
  address,
  saving,
  onFullNameChange,
  onMobileNumberChange,
  onAddressChange,
  onSave,
}: EditProfileFormProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast({ title: "Enter a new password", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Profile Info */}
      <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Edit Profile</h3>
            <p className="text-xs text-muted-foreground">Update your personal information</p>
          </div>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => onFullNameChange(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3.5 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-sm placeholder:text-muted-foreground/60"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => onMobileNumberChange(e.target.value)}
                placeholder="Enter your mobile number"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-sm placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border/40 bg-muted/30">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground text-sm truncate">{email}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 ml-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <span>Address</span>
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4 w-4 h-4 text-muted-foreground/60" />
              <textarea
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                placeholder="Enter your delivery/shipping address"
                rows={3}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-sm placeholder:text-muted-foreground/60 resize-none"
              />
            </div>
          </div>
          
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2.5 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Change Password</h3>
            <p className="text-xs text-muted-foreground">Update your account password</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-sm placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-sm placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2.5 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 text-sm"
          >
            <Lock className="w-4 h-4" />
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileForm;
