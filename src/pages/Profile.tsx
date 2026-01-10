import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, User, Settings, ShoppingBag, Mail, Save, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import OrdersTab from "@/components/OrdersTab";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
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
        .update({ full_name: fullName.trim() })
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
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero pb-8 md:pb-12">
      <div className="container max-w-6xl mx-auto px-4 pt-4 md:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-bold text-xl md:text-2xl text-foreground">My Profile</h1>
          <div className="w-10" />
        </div>

        {/* Desktop/Tablet Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar - Profile Card & Quick Actions */}
          <div className="lg:col-span-4 xl:col-span-3">
            {/* Profile Card */}
            <div className="glass-card rounded-3xl p-6 shadow-soft mb-6">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full gradient-cta flex items-center justify-center text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                  {(fullName || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <h2 className="text-lg md:text-xl font-bold text-foreground text-center">{fullName || "User"}</h2>
                <p className="text-sm text-muted-foreground text-center break-all">{user.email}</p>
                {isAdmin && (
                  <span className="mt-2 px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-medium">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions - Desktop Sidebar */}
            <div className="hidden lg:block space-y-3 mb-6">
              <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
              <Link to="/cart" className="glass-card rounded-2xl p-4 shadow-soft flex items-center gap-4 hover:bg-white/80 transition-colors">
                <div className="w-10 h-10 rounded-full bg-cyan-light/50 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-teal" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">My Cart</h4>
                  <p className="text-xs text-muted-foreground">View your shopping cart</p>
                </div>
              </Link>

              {isAdmin && (
                <Link to="/admin" className="glass-card rounded-2xl p-4 shadow-soft flex items-center gap-4 hover:bg-white/80 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">Admin Panel</h4>
                    <p className="text-xs text-muted-foreground">Manage products & settings</p>
                  </div>
                </Link>
              )}

              <button
                onClick={handleSignOut}
                className="w-full glass-card rounded-2xl p-4 shadow-soft flex items-center gap-4 hover:bg-coral/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-coral" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-foreground">Sign Out</h4>
                  <p className="text-xs text-muted-foreground">Log out of your account</p>
                </div>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 md:mb-6">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 md:flex-none md:px-8 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === "profile"
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "glass-card text-foreground hover:bg-white/80"
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`flex-1 md:flex-none md:px-8 py-2.5 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === "orders"
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "glass-card text-foreground hover:bg-white/80"
                }`}
              >
                <Package className="w-4 h-4" />
                My Orders
              </button>
            </div>

            {activeTab === "profile" ? (
              <div className="md:grid md:grid-cols-2 md:gap-6">
                {/* Edit Profile */}
                <div className="glass-card rounded-2xl p-4 md:p-6 shadow-soft mb-4 md:mb-0">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> Edit Profile
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full mt-1 px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <div className="flex items-center gap-2 mt-1 px-4 py-2.5 rounded-xl border border-border bg-muted/50">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground truncate">{user.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full py-3 rounded-full gradient-cta text-white font-medium shadow-soft disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                {/* Quick Actions - Mobile/Tablet (shows in grid on tablet) */}
                <div className="lg:hidden space-y-3">
                  <h3 className="font-semibold text-foreground mb-3 md:hidden">Quick Actions</h3>
                  <Link to="/cart" className="glass-card rounded-2xl p-4 shadow-soft flex items-center gap-4 hover:bg-white/80 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-cyan-light/50 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-teal" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">My Cart</h4>
                      <p className="text-xs text-muted-foreground">View your shopping cart</p>
                    </div>
                  </Link>

                  {isAdmin && (
                    <Link to="/admin" className="glass-card rounded-2xl p-4 shadow-soft flex items-center gap-4 hover:bg-white/80 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-gold" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">Admin Panel</h4>
                        <p className="text-xs text-muted-foreground">Manage products & settings</p>
                      </div>
                    </Link>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="w-full glass-card rounded-2xl p-4 shadow-soft flex items-center gap-4 hover:bg-coral/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-coral" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-medium text-foreground">Sign Out</h4>
                      <p className="text-xs text-muted-foreground">Log out of your account</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <OrdersTab />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
