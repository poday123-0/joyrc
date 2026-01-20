import { useState, useEffect } from "react";
import { Shield, Trash2, UserPlus, Users, X, Crown, ArrowDown, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
}

const AdminManagementTab = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("123456");
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [adminToPromote, setAdminToPromote] = useState<string | null>(null);
  const [demoteDialogOpen, setDemoteDialogOpen] = useState(false);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    
    // Get all admin and super_admin roles
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("*")
      .or("role.eq.admin,role.eq.super_admin");

    if (roles) {
      // Get profiles for these users
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const adminsWithInfo = roles.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          ...role,
          full_name: profile?.full_name || "Unknown",
        };
      });

      setAdmins(adminsWithInfo);

      // Check if current user is super_admin
      if (user) {
        const isSuperAdmin = roles.some(r => r.user_id === user.id && (r.role as string) === "super_admin");
        setCurrentUserIsSuperAdmin(isSuperAdmin);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, [user]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: newEmail.trim(),
          full_name: newName.trim() || null,
          password: newPassword || "123456",
          make_admin: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ 
        title: "Admin Created", 
        description: `${newEmail} has been added as admin with password: ${newPassword || "123456"}` 
      });
      setShowForm(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("123456");
      fetchAdmins();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClick = (userId: string) => {
    setAdminToRemove(userId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!adminToRemove) return;

    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "remove_admin",
          user_id: adminToRemove,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ 
        title: "Admin Removed", 
        description: "Admin privileges have been revoked." 
      });
      fetchAdmins();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
    setDeleteDialogOpen(false);
    setAdminToRemove(null);
  };

  const handlePromoteClick = (userId: string) => {
    setAdminToPromote(userId);
    setPromoteDialogOpen(true);
  };

  const handleConfirmPromote = async () => {
    if (!adminToPromote) return;

    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "promote_to_super_admin",
          user_id: adminToPromote,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ 
        title: "Promoted", 
        description: "User has been promoted to Super Admin." 
      });
      fetchAdmins();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
    setPromoteDialogOpen(false);
    setAdminToPromote(null);
  };

  const handleDemoteSelf = async () => {
    if (!user) return;

    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "demote_self",
          user_id: user.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ 
        title: "Demoted", 
        description: "You have been demoted to Admin." 
      });
      fetchAdmins();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
    setDemoteDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const superAdmins = admins.filter(a => (a.role as string) === "super_admin");
  const regularAdmins = admins.filter(a => (a.role as string) === "admin");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Admin Users ({admins.length})</h2>
        <div className="flex items-center gap-2">
          {currentUserIsSuperAdmin && superAdmins.length > 1 && (
            <button
              onClick={() => setDemoteDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-600 text-sm font-medium"
            >
              <ArrowDown className="w-4 h-4" /> Demote Self
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium shadow-soft"
          >
            <UserPlus className="w-4 h-4" /> Add Admin
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Add New Admin</h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Admin Name"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground mt-1">Default: 123456</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !newEmail.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {saving ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Super Admins Section */}
      {superAdmins.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" /> Super Admins
          </h3>
          <div className="space-y-2">
            {superAdmins.map((admin) => (
              <div
                key={admin.id}
                className="glass-card rounded-xl p-3 flex items-center gap-3 shadow-soft border-2 border-amber-500/30"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
                    {admin.full_name}
                    {admin.user_id === user?.id && (
                      <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Super Admin since {format(new Date(admin.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Admins Section */}
      <div className="space-y-2">
        {regularAdmins.length > 0 && (
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Admins
          </h3>
        )}
        {regularAdmins.map((admin) => (
          <div
            key={admin.id}
            className="glass-card rounded-xl p-3 flex items-center gap-3 shadow-soft"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm">{admin.full_name}</h4>
              <p className="text-xs text-muted-foreground">
                Admin since {format(new Date(admin.created_at), "MMM d, yyyy")}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                ID: {admin.user_id.slice(0, 8)}...
              </p>
            </div>
            {currentUserIsSuperAdmin && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePromoteClick(admin.user_id)}
                  className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center hover:bg-amber-500/20"
                  title="Promote to Super Admin"
                >
                  <ArrowUp className="w-4 h-4 text-amber-500" />
                </button>
                <button
                  onClick={() => handleRemoveClick(admin.user_id)}
                  className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                  title="Remove Admin"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            )}
          </div>
        ))}

        {admins.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No admin users found.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Admin?"
        description="This will revoke admin privileges from this user. They will no longer be able to access the admin panel."
        confirmText="Remove Admin"
        variant="destructive"
        onConfirm={handleConfirmRemove}
      />

      <ConfirmDialog
        open={promoteDialogOpen}
        onOpenChange={setPromoteDialogOpen}
        title="Promote to Super Admin?"
        description="This will give this user super admin privileges. They will be able to manage other admins and promote/demote users."
        confirmText="Promote"
        onConfirm={handleConfirmPromote}
      />

      <ConfirmDialog
        open={demoteDialogOpen}
        onOpenChange={setDemoteDialogOpen}
        title="Demote Yourself?"
        description="You will lose super admin privileges and become a regular admin. Make sure there's at least one other super admin before doing this."
        confirmText="Demote"
        variant="destructive"
        onConfirm={handleDemoteSelf}
      />
    </div>
  );
};

export default AdminManagementTab;
