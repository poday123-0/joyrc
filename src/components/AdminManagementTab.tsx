import { useState, useEffect } from "react";
import { Plus, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ConfirmDialog from "@/components/ConfirmDialog";

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
}

const AdminManagementTab = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);

  const fetchAdmins = async () => {
    setLoading(true);
    
    // Get all admin roles
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("role", "admin");

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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // First, we need to find the user by email
      // Since we can't query auth.users directly, we'll check if there's a profile with that email
      // The user would need to already have an account
      
      toast({
        title: "Note",
        description: "To add an admin, the user must first create an account. After they sign up, you can promote them to admin using their user ID.",
      });
      
      // For now, we'll prompt for user_id directly
      const userId = prompt("Enter the User ID to make admin (they must already have an account):");
      
      if (!userId) {
        setSaving(false);
        return;
      }

      // Check if already admin
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();

      if (existing) {
        toast({ 
          title: "Already Admin", 
          description: "This user is already an admin.",
          variant: "destructive" 
        });
        setSaving(false);
        return;
      }

      // Add admin role
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
        });

      if (error) throw error;

      toast({ 
        title: "Admin Added", 
        description: "User has been granted admin privileges." 
      });
      setShowForm(false);
      setEmail("");
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

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", adminToRemove)
      .eq("role", "admin");

    if (error) {
      toast({ 
        title: "Failed to remove admin", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Admin Removed", 
        description: "Admin privileges have been revoked." 
      });
      fetchAdmins();
    }
    setDeleteDialogOpen(false);
    setAdminToRemove(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Admin Users ({admins.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium shadow-soft"
        >
          <UserPlus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft">
          <h3 className="font-semibold mb-3">Add New Admin</h3>
          <p className="text-sm text-muted-foreground mb-4">
            To add a new admin, the user must first create an account. Then click the button below 
            and enter their User ID (found in the database).
          </p>
          <button
            onClick={handleAddAdmin}
            disabled={saving}
            className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            {saving ? "Processing..." : "Grant Admin Access"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="glass-card rounded-xl p-3 flex items-center gap-3 shadow-soft"
          >
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-gold" />
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
            {admins.length > 1 && (
              <button
                onClick={() => handleRemoveClick(admin.user_id)}
                className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
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
    </div>
  );
};

export default AdminManagementTab;
