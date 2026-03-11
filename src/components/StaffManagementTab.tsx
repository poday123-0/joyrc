import { useState, useEffect } from "react";
import { User, Trash2, Search, RefreshCw, Shield, ShieldOff, UserPlus, X, KeyRound, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "./ConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  email?: string;
  is_admin?: boolean;
  is_super_admin?: boolean;
  permissions?: string[];
}

// Define available permission areas - granular per tab
const PERMISSION_AREAS = [
  // Products & Inventory
  { key: "tab_products", label: "Products", description: "Add, edit and manage products" },
  { key: "tab_categories", label: "Categories", description: "Manage product categories" },
  { key: "tab_stock", label: "Stock Management", description: "View and update inventory levels" },
  { key: "tab_featured", label: "Featured Products", description: "Manage featured product highlights" },
  
  // Orders & Sales
  { key: "tab_pos", label: "Quick POS", description: "Create walk-in and delivery sales" },
  { key: "tab_orders", label: "Orders", description: "View and manage customer orders" },
  { key: "tab_preorders", label: "Pre-orders", description: "Manage pre-order requests" },
  { key: "tab_deliveries", label: "Deliveries", description: "Manage delivery assignments" },
  
  // Content & Media
  { key: "tab_hero", label: "Hero Banners", description: "Manage homepage hero backgrounds" },
  { key: "tab_videos", label: "Videos", description: "Manage video showcases" },
  { key: "tab_home-content", label: "Home Content", description: "Edit homepage features and CTA" },
  { key: "tab_support", label: "Support Content", description: "Manage FAQ and support articles" },
  { key: "tab_footer", label: "Footer Settings", description: "Configure footer links and info" },
  { key: "tab_storage", label: "Storage", description: "Manage uploaded files and images" },
  
  // Communication
  { key: "tab_messages", label: "Messages", description: "View and respond to contact messages" },
  { key: "tab_email-templates", label: "Email Templates", description: "Manage email templates" },
  { key: "tab_marketing", label: "Marketing Emails", description: "Send marketing campaigns" },
  
  // Financial (Admin only usually)
  { key: "tab_transactions", label: "Transactions", description: "View financial transactions" },
  { key: "tab_reports", label: "Reports", description: "View sales reports and analytics" },
  { key: "tab_bank", label: "Bank Settings", description: "Manage bank account details" },
  
  // User Management
  { key: "tab_users", label: "Users", description: "View and manage customer accounts" },
];

const StaffManagementTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("123456");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch admin and super_admin roles
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const adminUserIds = new Set(
        adminRoles?.filter(r => r.role === "admin" || r.role === "super_admin").map(r => r.user_id) || []
      );
      const superAdminUserIds = new Set(
        adminRoles?.filter(r => r.role === "super_admin").map(r => r.user_id) || []
      );

      // Fetch staff permissions
      const { data: permissions } = await supabase
        .from("staff_permissions")
        .select("user_id, permission_key");

      const userPermissions: Record<string, string[]> = {};
      permissions?.forEach(p => {
        if (!userPermissions[p.user_id]) userPermissions[p.user_id] = [];
        userPermissions[p.user_id].push(p.permission_key);
      });

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        is_admin: adminUserIds.has(profile.user_id),
        is_super_admin: superAdminUserIds.has(profile.user_id),
        permissions: userPermissions[profile.user_id] || [],
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        
        if (error) throw error;
        toast({ title: "Admin role removed" });
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        
        if (error) throw error;
        toast({ title: "Admin role granted" });
      }
      
      fetchUsers();
    } catch (error) {
      console.error("Error toggling admin:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    setDeleting(true);
    
    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", user_id: deleteUserId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

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
        body: { action: "reset_password", user_id: resetPasswordUserId, new_password: "123456" },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: "Password Reset", description: "New password: 123456" });
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

  const handleCreateUser = async () => {
    if (!newUserEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    // Staff must have at least one permission
    if (selectedPermissions.length === 0) {
      toast({ title: "Please select at least one permission", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      // Create user WITHOUT admin role - staff only get permissions
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: newUserEmail.trim(),
          full_name: newUserName.trim() || null,
          password: newUserPassword || "123456",
          make_admin: false, // Never make staff as admin - they only get permissions
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      const userId = response.data?.user?.id;

      // Add permissions for staff member
      if (userId && selectedPermissions.length > 0) {
        const permissionInserts = selectedPermissions.map(p => ({
          user_id: userId,
          permission_key: p,
        }));
        await supabase.from("staff_permissions").insert(permissionInserts);
      }

      toast({ title: "Staff member created!", description: `Password: ${newUserPassword || "123456"}` });
      setShowAddUser(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("123456");
      setSelectedPermissions([]);
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

  const handleExpandUser = (userId: string, currentPermissions: string[]) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setEditingPermissions([]);
    } else {
      setExpandedUserId(userId);
      setEditingPermissions([...currentPermissions]);
    }
  };

  const handleSavePermissions = async (userId: string) => {
    setSavingPermissions(true);
    try {
      // Delete existing permissions
      await supabase.from("staff_permissions").delete().eq("user_id", userId);
      
      // Insert new permissions
      if (editingPermissions.length > 0) {
        const permissionInserts = editingPermissions.map(p => ({
          user_id: userId,
          permission_key: p,
        }));
        await supabase.from("staff_permissions").insert(permissionInserts);
      }

      toast({ title: "Permissions updated" });
      setExpandedUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions",
        variant: "destructive",
      });
    }
    setSavingPermissions(false);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Staff = users who have permissions (not admins)
  // Admins/SuperAdmins are shown in AdminManagementTab
  const staffUsers = filteredUsers.filter(u => 
    !u.is_admin && !u.is_super_admin && u.permissions && u.permissions.length > 0
  );
  const regularUsers = filteredUsers.filter(u => 
    !u.is_admin && !u.is_super_admin && (!u.permissions || u.permissions.length === 0)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const togglePermission = (perm: string, isEditing: boolean) => {
    if (isEditing) {
      setEditingPermissions(prev => 
        prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
      );
    } else {
      setSelectedPermissions(prev => 
        prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff
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

      {/* Add Staff Form */}
      {showAddUser && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Add New Staff Member</h3>
            <button
              onClick={() => {
                setShowAddUser(false);
                setSelectedPermissions([]);
              }}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
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

          {/* Permission Selection - Always visible for staff */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium text-foreground">Access Permissions <span className="text-destructive">*</span></h4>
            <p className="text-xs text-muted-foreground">Select at least one tab the staff member can access</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERMISSION_AREAS.map((perm) => (
                <div
                  key={perm.key}
                  onClick={() => togglePermission(perm.key, false)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPermissions.includes(perm.key)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedPermissions.includes(perm.key)}
                      onCheckedChange={() => togglePermission(perm.key, false)}
                    />
                    <span className="font-medium text-sm text-foreground">{perm.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">{perm.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setShowAddUser(false);
                setSelectedPermissions([]);
              }}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              disabled={creating || !newUserEmail.trim() || selectedPermissions.length === 0}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Staff"}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-xl">
          <p className="text-2xl font-bold text-foreground">{users.length}</p>
          <p className="text-sm text-muted-foreground">Total Users</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-xl">
          <p className="text-2xl font-bold text-primary">{staffUsers.length}</p>
          <p className="text-sm text-muted-foreground">Staff Members</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-xl">
          <p className="text-2xl font-bold text-amber-500">{users.filter(u => u.is_super_admin).length}</p>
          <p className="text-sm text-muted-foreground">Super Admins</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-xl">
          <p className="text-2xl font-bold text-foreground">{regularUsers.length}</p>
          <p className="text-sm text-muted-foreground">Regular Users</p>
        </div>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Staff Members Section */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Staff Members ({staffUsers.length})
            </h3>
            {staffUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff members found</p>
            ) : (
              <div className="space-y-3">
                {staffUsers.map((user) => (
                  <div key={user.id} className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">
                              {user.full_name || "No name"}
                            </p>
                            {user.is_super_admin && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 text-xs rounded-full">
                                Super Admin
                              </span>
                            )}
                            {user.is_admin && !user.is_super_admin && (
                              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(user.created_at)} • {user.permissions?.length || 0} permissions
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        <button
                          onClick={() => handleExpandUser(user.user_id, user.permissions || [])}
                          className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                          title="Manage permissions"
                        >
                          {expandedUserId === user.user_id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <Settings className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setResetPasswordUserId(user.user_id)}
                          className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleAdmin(user.user_id, user.is_admin || false)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_admin
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          title={user.is_admin ? "Remove admin role" : "Grant admin role"}
                        >
                          {user.is_admin ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteUserId(user.user_id)}
                          className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Permissions Editor */}
                    {expandedUserId === user.user_id && (
                      <div className="p-4 bg-background border-t border-border space-y-3">
                        <h4 className="text-sm font-medium text-foreground">Edit Access Permissions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {PERMISSION_AREAS.map((perm) => (
                            <div
                              key={perm.key}
                              onClick={() => togglePermission(perm.key, true)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                editingPermissions.includes(perm.key)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={editingPermissions.includes(perm.key)}
                                  onCheckedChange={() => togglePermission(perm.key, true)}
                                />
                                <span className="font-medium text-sm text-foreground">{perm.label}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 ml-6">{perm.description}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => setExpandedUserId(null)}
                            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSavePermissions(user.user_id)}
                            disabled={savingPermissions}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
                          >
                            {savingPermissions ? "Saving..." : "Save Permissions"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regular Users Section - Can be promoted to staff */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Regular Users ({regularUsers.length})
              <span className="text-xs text-muted-foreground font-normal ml-2">Click settings to add as staff</span>
            </h3>
            {regularUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No regular users found</p>
            ) : (
              <div className="space-y-3">
                {regularUsers.slice(0, 20).map((user) => (
                  <div key={user.id} className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-muted-foreground" />
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
                          onClick={() => handleExpandUser(user.user_id, [])}
                          className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                          title="Add as staff"
                        >
                          {expandedUserId === user.user_id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <Settings className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setResetPasswordUserId(user.user_id)}
                          className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleAdmin(user.user_id, false)}
                          className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                          title="Make admin"
                        >
                          <ShieldOff className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteUserId(user.user_id)}
                          className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Permissions Editor - Add staff permissions to regular user */}
                    {expandedUserId === user.user_id && (
                      <div className="p-4 bg-background border-t border-border space-y-3">
                        <h4 className="text-sm font-medium text-foreground">Add as Staff - Select Permissions</h4>
                        <p className="text-xs text-muted-foreground">Select permissions to convert this user to a staff member</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {PERMISSION_AREAS.map((perm) => (
                            <div
                              key={perm.key}
                              onClick={() => togglePermission(perm.key, true)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                editingPermissions.includes(perm.key)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={editingPermissions.includes(perm.key)}
                                  onCheckedChange={() => togglePermission(perm.key, true)}
                                />
                                <span className="font-medium text-sm text-foreground">{perm.label}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 ml-6">{perm.description}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => setExpandedUserId(null)}
                            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSavePermissions(user.user_id)}
                            disabled={savingPermissions || editingPermissions.length === 0}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
                          >
                            {savingPermissions ? "Saving..." : "Make Staff"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {regularUsers.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Showing 20 of {regularUsers.length} users
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        onConfirm={handleDeleteUser}
        title="Delete User Completely"
        description="This will permanently delete the user's account, profile, and all associated data. This action cannot be undone."
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

export default StaffManagementTab;
