import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { format } from "date-fns";
import { Package, Phone, Mail, User, MessageSquare, Check, X, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Preorder {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  quantity: number;
  notes: string | null;
  status: string;
  created_at: string;
  product?: {
    name: string;
    price: number;
    image_url: string | null;
    stock_quantity: number;
  };
}

const PreordersTab = () => {
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchPreorders();
  }, []);

  const fetchPreorders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("preorders")
      .select(`
        *,
        product:products (
          name,
          price,
          image_url,
          stock_quantity
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching preorders:", error);
      toast({
        title: "Error",
        description: "Failed to load pre-orders",
        variant: "destructive"
      });
    } else {
      setPreorders(data as Preorder[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("preorders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    } else {
      setPreorders(prev => 
        prev.map(p => p.id === id ? { ...p, status: newStatus } : p)
      );
      toast({
        title: "Status Updated",
        description: `Pre-order marked as ${newStatus}`
      });
    }
  };

  const deletePreorder = async () => {
    if (!deleteId) return;
    
    const { error } = await supabase
      .from("preorders")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete pre-order",
        variant: "destructive"
      });
    } else {
      setPreorders(prev => prev.filter(p => p.id !== deleteId));
      toast({
        title: "Deleted",
        description: "Pre-order request deleted"
      });
    }
    setDeleteId(null);
  };

  const filteredPreorders = preorders.filter(p => 
    statusFilter === "all" || p.status === statusFilter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "contacted":
        return <Badge className="gap-1 bg-blue-500"><Phone className="w-3 h-3" /> Contacted</Badge>;
      case "fulfilled":
        return <Badge className="gap-1 bg-green-500"><Check className="w-3 h-3" /> Fulfilled</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pre-orders List */}
      {filteredPreorders.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Pre-orders Yet</h3>
          <p className="text-muted-foreground">
            Pre-order requests will appear here when customers request out-of-stock products.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPreorders.map((preorder) => (
            <div key={preorder.id} className="bg-card border border-border rounded-xl p-4 space-y-4">
              {/* Product Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {preorder.product?.image_url ? (
                    <img 
                      src={preorder.product.image_url} 
                      alt={preorder.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {preorder.product?.name || "Unknown Product"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatMVR(preorder.product?.price || 0)} × {preorder.quantity} = {formatMVR((preorder.product?.price || 0) * preorder.quantity)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(preorder.status)}
                    {preorder.product && preorder.product.stock_quantity > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Now in stock ({preorder.product.stock_quantity})
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(preorder.created_at), "MMM d, yyyy")}
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{preorder.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${preorder.customer_phone}`} className="text-primary hover:underline">
                    {preorder.customer_phone}
                  </a>
                </div>
                {preorder.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${preorder.customer_email}`} className="text-primary hover:underline truncate">
                      {preorder.customer_email}
                    </a>
                  </div>
                )}
              </div>

              {/* Notes */}
              {preorder.notes && (
                <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <p className="text-muted-foreground">{preorder.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex gap-2">
                  <Select 
                    value={preorder.status} 
                    onValueChange={(value) => updateStatus(preorder.id, value)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="fulfilled">Fulfilled</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteId(preorder.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={deletePreorder}
        title="Delete Pre-order?"
        description="This will permanently delete this pre-order request. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

export default PreordersTab;
