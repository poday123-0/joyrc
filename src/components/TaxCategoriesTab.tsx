import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Save, X, Percent, Star } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface TaxCategory {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number | null;
}

const empty = { name: "", rate: 0, is_active: true, is_default: false };

const TaxCategoriesTab = () => {
  const [items, setItems] = useState<TaxCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TaxCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [confirmDelete, setConfirmDelete] = useState<TaxCategory | null>(null);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("tax_categories")
      .select("*")
      .order("is_default", { ascending: false })
      .order("rate", { ascending: true });
    setItems((data as TaxCategory[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);
  useRealtimeSubscription("tax_categories", fetchItems);

  const startCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const startEdit = (i: TaxCategory) => {
    setEditing(i);
    setForm({ name: i.name, rate: Number(i.rate), is_active: i.is_active, is_default: i.is_default });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (form.rate < 0 || form.rate > 100) { toast({ title: "Rate must be 0-100", variant: "destructive" }); return; }

    // If setting as default, unset other defaults
    if (form.is_default) {
      await supabase.from("tax_categories").update({ is_default: false }).neq("id", editing?.id || "00000000-0000-0000-0000-000000000000");
    }

    if (editing) {
      const { error } = await supabase.from("tax_categories").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Tax category updated" });
    } else {
      const { error } = await supabase.from("tax_categories").insert(form);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Tax category added" });
    }
    setShowForm(false);
    fetchItems();
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("tax_categories").delete().eq("id", confirmDelete.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else toast({ title: "Tax category removed" });
    setConfirmDelete(null);
    fetchItems();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Percent className="w-5 h-5 text-primary" /> Tax Categories</h2>
          <p className="text-xs text-muted-foreground">Define tax rates and assign them to products.</p>
        </div>
        <Button onClick={startCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> New</Button>
      </div>

      <div className="grid gap-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground italic">No tax categories yet.</p>}
        {items.map(i => (
          <div key={i.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{Number(i.rate)}%</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm truncate">{i.name}</p>
                  {i.is_default && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                  {!i.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">inactive</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(i)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "Edit Tax Category" : "New Tax Category"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. GST 8%" />
            </div>
            <div>
              <Label className="text-xs">Rate (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <Label className="text-xs">Default for new products</Label>
              <Switch checked={form.is_default} onCheckedChange={v => setForm({ ...form, is_default: v })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1"><Save className="w-4 h-4 mr-1" /> Save</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete tax category?"
        description={`This will remove "${confirmDelete?.name}". Products using it will fall back to no tax.`}
        confirmText="Delete"
        onConfirm={remove}
      />
    </div>
  );
};

export default TaxCategoriesTab;
