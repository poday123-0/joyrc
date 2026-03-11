import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { User, Trash2, Search, RefreshCw, UserPlus, X, KeyRound, Phone, Mail, Edit2, MapPin, ShoppingBag, Package, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import ConfirmDialog from "./ConfirmDialog";
import EditCustomerDialog from "./EditCustomerDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  mobile_number: string | null;
  created_at: string;
  email?: string;
  is_admin?: boolean;
  address?: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  color_name: string | null;
}

interface CustomerOrder {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
  order_items: OrderItem[];
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
  const [newUserMobile, setNewUserMobile] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("123456");
  const [newUserAddress, setNewUserAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<UserProfile | null>(null);
  
  // Order history state
  const [selectedCustomerForOrders, setSelectedCustomerForOrders] = useState<UserProfile | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Use the edge function to get customer users with emails
      const response = await supabase.functions.invoke("get-customer-users");

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const customers = response.data?.customers || [];
      setUsers(customers.map((customer: UserProfile) => ({
        ...customer,
        is_admin: false,
      })));
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

  useRealtimeSubscription(['profiles', 'user_roles'], fetchUsers, 'rt-users');

  const fetchCustomerOrders = async (userId: string) => {
    setLoadingOrders(true);
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          status,
          payment_status,
          payment_method,
          created_at,
          order_items (
            id,
            product_name,
            product_price,
            quantity,
            color_name
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomerOrders(orders || []);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      toast({
        title: "Error",
        description: "Failed to load order history",
        variant: "destructive",
      });
    }
    setLoadingOrders(false);
  };

  const handleViewOrders = (user: UserProfile) => {
    setSelectedCustomerForOrders(user);
    fetchCustomerOrders(user.user_id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "text-emerald-600 bg-emerald-500/10";
      case "cancelled": return "text-rose-500 bg-rose-500/10";
      case "processing": case "shipped": return "text-blue-600 bg-blue-500/10";
      default: return "text-amber-600 bg-amber-500/10";
    }
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
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.mobile_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
          mobile_number: newUserMobile.trim() || null,
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
      setNewUserMobile("");
      setNewUserPassword("123456");
      setNewUserAddress("");
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
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-4">
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
                Full Name *
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
                Mobile Number *
              </label>
              <input
                type="tel"
                value={newUserMobile}
                onChange={(e) => setNewUserMobile(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                Address <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={newUserAddress}
                onChange={(e) => setNewUserAddress(e.target.value)}
                placeholder="Enter delivery/shipping address"
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
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
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {user.full_name || "No name"}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {user.mobile_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {user.mobile_number}
                      </span>
                    )}
                    {user.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </span>
                    )}
                    {user.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{user.address}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Joined {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <button
                  onClick={() => handleViewOrders(user)}
                  className="p-2 bg-accent/50 text-accent-foreground rounded-lg hover:bg-accent/70 transition-colors"
                  title="View order history"
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingCustomer(user)}
                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  title="Edit customer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
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

      <EditCustomerDialog
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer}
        onSuccess={fetchUsers}
      />

      {/* Order History Sheet */}
      <Sheet open={!!selectedCustomerForOrders} onOpenChange={(open) => !open && setSelectedCustomerForOrders(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Order History - {selectedCustomerForOrders?.full_name || "Customer"}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No orders found for this customer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                        <p className="font-semibold text-foreground">{formatMVR(order.total_amount)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        {order.payment_status && (
                          <p className="text-xs text-muted-foreground mt-1 capitalize">
                            {order.payment_status.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate text-foreground">{item.product_name}</span>
                            {item.color_name && (
                              <span className="text-xs text-muted-foreground">({item.color_name})</span>
                            )}
                          </div>
                          <div className="text-right text-muted-foreground flex-shrink-0 ml-2">
                            <span>×{item.quantity}</span>
                            <span className="ml-2">{formatMVR(item.product_price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.payment_method && (
                      <p className="text-xs text-muted-foreground">
                        Payment: <span className="capitalize">{order.payment_method.replace(/_/g, " ")}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default UsersManagementTab;