import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Plus, X, Pencil, Trash2, CreditCard, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface CardType {
  id: string;
  name: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number | null;
}

const CardTypesTab = () => {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [formData, setFormData] = useState({ name: "", icon: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  useEffect(() => { fetchCardTypes(); }, []);

  const fetchCardTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("card_types")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) setCardTypes(data);
    setLoading(false);
  };

  useRealtimeSubscription("card_types", fetchCardTypes, "rt-card-types");

  const resetForm = () => {
    setFormData({ name: "", icon: "", is_active: true });
    setEditingCard(null);
    setShowForm(false);
  };

  const handleEdit = (card: CardType) => {
    setEditingCard(card);
    setFormData({ name: card.name, icon: card.icon || "", is_active: card.is_active });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cardData = {
        name: formData.name.trim(),
        icon: formData.icon.trim() || null,
        is_active: formData.is_active,
      };
      if (editingCard) {
        const { error } = await supabase.from("card_types").update(cardData).eq("id", editingCard.id);
        if (error) throw error;
        toast({ title: "Card Type Updated", description: `${formData.name} has been updated.` });
      } else {
        const { error } = await supabase.from("card_types").insert(cardData);
        if (error) throw error;
        toast({ title: "Card Type Added", description: `${formData.name} has been added.` });
      }
      resetForm();
      fetchCardTypes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    const { error } = await supabase.from("card_types").delete().eq("id", cardToDelete);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Card Type Removed", description: "The card type has been deleted." });
      fetchCardTypes();
    }
    setDeleteDialogOpen(false);
    setCardToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Card Types</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium shadow-soft"
        >
          <Plus className="w-4 h-4" /> Add Card Type
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">{editingCard ? "Edit Card Type" : "New Card Type"}</h4>
            <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Card Type Name (e.g., Visa, Amex)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="text"
              placeholder="Icon (optional, e.g., 💳)"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
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
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "Saving..." : editingCard ? "Update" : "Add Card Type"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {cardTypes.map((card) => (
          <div key={card.id} className="glass-card rounded-2xl p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.is_active ? "bg-primary/10" : "bg-muted"}`}>
                <CreditCard className={`w-5 h-5 ${card.is_active ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground">{card.icon} {card.name}</h4>
                  {card.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-mint/20 text-mint">Active</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(card)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => { setCardToDelete(card.id); setDeleteDialogOpen(true); }} className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {cardTypes.length === 0 && (
          <div className="text-center py-8">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No card types configured</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Card Type?"
        description="This card type will no longer be available for selection."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default CardTypesTab;
