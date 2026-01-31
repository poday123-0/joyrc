import { useState, useEffect } from "react";
import { User, Trash2, Search, RefreshCw, UserPlus, X, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "./ConfirmDialog";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  email?: string;
  is_admin?: boolean;
}

const UsersManagementTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("123456");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with user roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all admin and super_admin roles to exclude them
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .or("role.eq.admin,role.eq.super_admin");

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      // Filter to only show customers (users without admin/super_admin roles)
      const customerProfiles = (profiles || [])
        .filter(profile => !adminUserIds.has(profile.user_id))
        .map(profile => ({
          ...profile,
          is_admin: false,
        }));

      setUsers(customerProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    setDeleting(true);
    
    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "delete",
          user_id: deleteUserId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "User deleted successfully" });
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
    setDeleting(false);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUserId) return;
    
    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "reset_password",
          user_id: resetPasswordUserId,
          new_password: "123456",
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ 
        title: "Password Reset", 
        description: "New password: 123456" 
      });
      setResetPasswordUserId(null);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCreateUser = async () => {
    if (!newUserEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: newUserEmail.trim(),
          full_name: newUserName.trim() || null,
          password: newUserPassword || "123456",
          make_admin: false,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "Customer created successfully!", description: `Password: ${newUserPassword || "123456"}` });
      setShowAddUser(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("123456");
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error creating user",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage registered customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </button>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Add User Form */}
      {showAddUser && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Add New Customer</h3>
            <button
              onClick={() => setShowAddUser(false)}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email *
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                type="text"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">Default: 123456</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAddUser(false)}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              disabled={creating || !newUserEmail.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Stats */}
      <div className="p-4 bg-muted/30 rounded-xl">
        <p className="text-2xl font-bold text-foreground">{users.length}</p>
        <p className="text-sm text-muted-foreground">Total Customers</p>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {user.full_name || "No name"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <button
                  onClick={() => setResetPasswordUserId(user.user_id)}
                  className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  title="Reset password to 123456"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteUserId(user.user_id)}
                  className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                  title="Delete customer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        onConfirm={handleDeleteUser}
        title="Delete User Completely"
        description="This will permanently delete the user's account, profile, and all associated data. This action cannot be undone. Are you sure?"
        variant="destructive"
        confirmText={deleting ? "Deleting..." : "Delete"}
      />

      <ConfirmDialog
        open={!!resetPasswordUserId}
        onOpenChange={(open) => !open && setResetPasswordUserId(null)}
        onConfirm={handleResetPassword}
        title="Reset Password"
        description="This will reset the user's password to '123456'. They can change it after logging in."
        confirmText="Reset Password"
      />
    </div>
  );
};

export default UsersManagementTab;