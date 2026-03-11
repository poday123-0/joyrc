import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Plus, Pencil, Trash2, X, Save, MessageSquare, Clock, MapPin, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface SupportContent {
  id: string;
  type: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
}

const SupportContentTab = () => {
  const [content, setContent] = useState<SupportContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SupportContent | null>(null);
  const [formData, setFormData] = useState({
    type: "faq",
    title: "",
    content: "",
    sort_order: "0",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_content")
      .select("*")
      .order("type")
      .order("sort_order");
    
    if (data) setContent(data);
    setLoading(false);
  };

  useRealtimeSubscription('support_content', fetchContent, 'rt-support-content');

  useEffect(() => {
    fetchContent();
  }, []);

  const resetForm = () => {
    setFormData({ type: "faq", title: "", content: "", sort_order: "0", is_active: true });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: SupportContent) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      title: item.title,
      content: item.content,
      sort_order: item.sort_order.toString(),
      is_active: item.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const itemData = {
        type: formData.type,
        title: formData.title.trim(),
        content: formData.content.trim(),
        sort_order: parseInt(formData.sort_order),
        is_active: formData.is_active,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("support_content")
          .update(itemData)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Content Updated", description: "Support content has been updated." });
      } else {
        const { error } = await supabase
          .from("support_content")
          .insert(itemData);
        if (error) throw error;
        toast({ title: "Content Added", description: "New support content has been added." });
      }

      resetForm();
      fetchContent();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase.from("support_content").delete().eq("id", itemToDelete);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Content Deleted", description: "Support content has been removed." });
      fetchContent();
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "faq": return <HelpCircle className="w-4 h-4" />;
      case "contact_info": return <MessageSquare className="w-4 h-4" />;
      case "business_hours": return <Clock className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "faq": return "FAQ";
      case "contact_info": return "Contact Info";
      case "business_hours": return "Business Hours";
      default: return type;
    }
  };

  const groupedContent = content.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, SupportContent[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium shadow-soft"
        >
          <Plus className="w-4 h-4" /> Add Content
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingItem ? "Edit Content" : "New Content"}</h3>
            <button onClick={resetForm}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="faq">FAQ</option>
              <option value="contact_info">Contact Info</option>
              <option value="business_hours">Business Hours</option>
            </select>
            <input
              type="text"
              placeholder={formData.type === "faq" ? "Question" : "Title (e.g., email, phone)"}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <textarea
              placeholder={formData.type === "faq" ? "Answer" : "Content/Value"}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent resize-none h-24"
              required
            />
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Sort order"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                className="w-24 px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : editingItem ? "Update" : "Add Content"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groupedContent).map(([type, items]) => (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              {getTypeIcon(type)}
              <h3 className="font-medium text-foreground">{getTypeLabel(type)}</h3>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`glass-card rounded-xl p-3 flex items-start gap-3 shadow-soft ${
                    !item.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(item)}
                      className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(item.id)}
                      className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {content.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No support content yet. Add FAQ, contact info, or business hours.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Content?"
        description="This will permanently remove this support content."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default SupportContentTab;
