import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, User, Settings, ShoppingBag, Mail, Save, Package, ChevronRight, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import OrdersTab from "@/components/OrdersTab";
import CustomerMessagesTab from "@/components/CustomerMessagesTab";

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
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "messages">("profile");

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
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-24 md:pb-12">
      <div className="container max-w-6xl mx-auto px-4 pt-4 md:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Link
            to="/"
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-card transition-all shadow-sm"
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
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm mb-6">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-2xl md:text-3xl lg:text-4xl font-bold mb-4 shadow-lg">
                  {(fullName || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <h2 className="text-lg md:text-xl font-bold text-foreground text-center">{fullName || "User"}</h2>
                <p className="text-sm text-muted-foreground text-center break-all mt-1">{user.email}</p>
                {isAdmin && (
                  <span className="mt-3 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                    Administrator
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions - Desktop Sidebar */}
            <div className="hidden lg:block space-y-2 mb-6">
              <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
              
              <Link 
                to="/cart" 
                className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:bg-card hover:border-primary/30 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-sm">My Cart</h4>
                  <p className="text-xs text-muted-foreground truncate">View your shopping cart</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:bg-card hover:border-primary/30 transition-all shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm">Admin Panel</h4>
                    <p className="text-xs text-muted-foreground truncate">Manage products & settings</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              )}

              <button
                onClick={handleSignOut}
                className="w-full group bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:bg-destructive/5 hover:border-destructive/30 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                  <LogOut className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-medium text-foreground text-sm">Sign Out</h4>
                  <p className="text-xs text-muted-foreground truncate">Log out of your account</p>
                </div>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Tabs - Only show Orders tab for regular customers */}
            {!isAdmin ? (
              <div className="flex gap-2 mb-6 p-1 bg-muted/50 rounded-xl backdrop-blur-sm overflow-x-auto">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === "profile"
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === "orders"
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Orders
                </button>
                <button
                  onClick={() => setActiveTab("messages")}
                  className={`flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === "messages"
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </button>
              </div>
            ) : (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground text-lg">Account Settings</h3>
                <p className="text-sm text-muted-foreground">Manage orders from the Admin Panel</p>
              </div>
            )}

            {activeTab === "profile" ? (
              <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
                {/* Edit Profile */}
                <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 md:p-6 shadow-sm">
                  <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2 text-base">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    Edit Profile
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/50">
                        <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground text-sm truncate">{user.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                {/* Quick Actions - Mobile/Tablet */}
                <div className="lg:hidden space-y-2">
                  <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wider text-muted-foreground md:hidden">Quick Actions</h3>
                  
                  <Link 
                    to="/cart" 
                    className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:bg-card hover:border-primary/30 transition-all shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm">My Cart</h4>
                      <p className="text-xs text-muted-foreground truncate">View your shopping cart</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>

                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:bg-card hover:border-primary/30 transition-all shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Settings className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm">Admin Panel</h4>
                        <p className="text-xs text-muted-foreground truncate">Manage products & settings</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="w-full group bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:bg-destructive/5 hover:border-destructive/30 transition-all shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                      <LogOut className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h4 className="font-medium text-foreground text-sm">Sign Out</h4>
                      <p className="text-xs text-muted-foreground truncate">Log out of your account</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : activeTab === "orders" && !isAdmin ? (
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-6 shadow-sm">
                <OrdersTab />
              </div>
            ) : activeTab === "messages" && !isAdmin ? (
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-6 shadow-sm">
                <CustomerMessagesTab />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
