import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import OrdersTab from "@/components/OrdersTab";
import CustomerMessagesTab from "@/components/CustomerMessagesTab";
import SendMessageTab from "@/components/SendMessageTab";
import ProfileCard from "@/components/profile/ProfileCard";
import QuickActions from "@/components/profile/QuickActions";
import ProfileTabs from "@/components/profile/ProfileTabs";
import EditProfileForm from "@/components/profile/EditProfileForm";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  mobile_number: string | null;
}

const Profile = () => {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "messages" | "send-message">("profile");
  const [messagesKey, setMessagesKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      let { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data && !error) {
        const googleName = user.user_metadata?.name || user.user_metadata?.full_name || "";
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
        
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            full_name: googleName,
            avatar_url: avatarUrl,
          })
          .select()
          .single();

        if (!insertError && newProfile) {
          data = newProfile;
        }
      }

      if (data) {
        setProfile(data);
        setFullName(data.full_name || user.user_metadata?.name || "");
        setMobileNumber(data.mobile_number || "");
      }
      setLoading(false);
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName.trim(),
          mobile_number: mobileNumber.trim() || null
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast({ title: "Profile updated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-24 md:pb-12">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container max-w-7xl mx-auto px-4 pt-6 md:pt-10 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 md:mb-12">
          <Link
            to="/"
            className="w-11 h-11 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-card hover:border-primary/30 transition-all duration-300 shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-bold text-2xl md:text-3xl text-foreground tracking-tight">My Profile</h1>
          <div className="w-11" />
        </div>

        {/* Desktop/Tablet Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          {/* Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6 mb-8 lg:mb-0">
            <ProfileCard
              fullName={fullName}
              email={user.email || ""}
              avatarUrl={profile?.avatar_url}
              isAdmin={isAdmin}
            />
            
            <div className="hidden lg:block">
              <QuickActions isAdmin={isAdmin} onSignOut={handleSignOut} />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9">
            <ProfileTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              isAdmin={isAdmin} 
            />

            {activeTab === "profile" ? (
              <div className="grid md:grid-cols-2 gap-6">
                <EditProfileForm
                  fullName={fullName}
                  mobileNumber={mobileNumber}
                  email={user.email || ""}
                  saving={saving}
                  onFullNameChange={setFullName}
                  onMobileNumberChange={setMobileNumber}
                  onSave={handleSaveProfile}
                />

                {/* Mobile Quick Actions */}
                <div className="lg:hidden">
                  <QuickActions isAdmin={isAdmin} onSignOut={handleSignOut} />
                </div>
              </div>
            ) : activeTab === "orders" && !isAdmin ? (
              <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-3xl p-5 md:p-8 shadow-lg">
                <OrdersTab />
              </div>
            ) : activeTab === "send-message" && !isAdmin ? (
              <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-3xl p-5 md:p-8 shadow-lg">
                <SendMessageTab onMessageSent={() => {
                  setMessagesKey(prev => prev + 1);
                  setActiveTab("messages");
                }} />
              </div>
            ) : activeTab === "messages" && !isAdmin ? (
              <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-3xl p-5 md:p-8 shadow-lg">
                <CustomerMessagesTab key={messagesKey} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
