import { User, Mail, Save, Phone } from "lucide-react";

interface EditProfileFormProps {
  fullName: string;
  mobileNumber: string;
  email: string;
  saving: boolean;
  onFullNameChange: (value: string) => void;
  onMobileNumberChange: (value: string) => void;
  onSave: () => void;
}

const EditProfileForm = ({
  fullName,
  mobileNumber,
  email,
  saving,
  onFullNameChange,
  onMobileNumberChange,
  onSave,
}: EditProfileFormProps) => {
  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-3xl p-6 md:p-8 shadow-lg">
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
  );
};

export default EditProfileForm;
