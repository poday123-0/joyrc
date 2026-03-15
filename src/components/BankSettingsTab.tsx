import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Plus, X, Pencil, Trash2, Building2, CheckCircle2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import CardTypesTab from "@/components/CardTypesTab";

interface BankSetting {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string | null;
  swift_code: string | null;
  is_active: boolean;
  logo_url: string | null;
}

const BankSettingsTab = () => {
  const [banks, setBanks] = useState<BankSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBank, setEditingBank] = useState<BankSetting | null>(null);
  const [formData, setFormData] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    branch: "",
    swift_code: "",
    is_active: true,
    logo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bank_settings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBanks(data);
    }
    setLoading(false);
  };

  useRealtimeSubscription('bank_settings', fetchBanks, 'rt-bank-settings');

  const resetForm = () => {
    setFormData({
      bank_name: "",
      account_name: "",
      account_number: "",
      branch: "",
      swift_code: "",
      is_active: true,
      logo_url: "",
    });
    setEditingBank(null);
    setShowForm(false);
  };

  const handleEdit = (bank: BankSetting) => {
    setEditingBank(bank);
    setFormData({
      bank_name: bank.bank_name,
      account_name: bank.account_name,
      account_number: bank.account_number,
      branch: bank.branch || "",
      swift_code: bank.swift_code || "",
      is_active: bank.is_active,
      logo_url: bank.logo_url || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const bankData = {
        bank_name: formData.bank_name.trim(),
        account_name: formData.account_name.trim(),
        account_number: formData.account_number.trim(),
        branch: formData.branch.trim() || null,
        swift_code: formData.swift_code.trim() || null,
        is_active: formData.is_active,
      };

      if (editingBank) {
        const { error } = await supabase
          .from("bank_settings")
          .update(bankData)
          .eq("id", editingBank.id);
        if (error) throw error;
        toast({
          title: "Bank Account Updated",
          description: `${formData.bank_name} details have been updated.`,
        });
      } else {
        const { error } = await supabase
          .from("bank_settings")
          .insert(bankData);
        if (error) throw error;
        toast({
          title: "Bank Account Added",
          description: `${formData.bank_name} has been added for payments.`,
        });
      }

      resetForm();
      fetchBanks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setBankToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!bankToDelete) return;

    const { error } = await supabase
      .from("bank_settings")
      .delete()
      .eq("id", bankToDelete);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bank Account Removed",
        description: "The bank account has been deleted.",
      });
      fetchBanks();
    }
    setDeleteDialogOpen(false);
    setBankToDelete(null);
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
        <h3 className="font-semibold text-foreground">Bank Accounts</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium shadow-soft"
        >
          <Plus className="w-4 h-4" /> Add Bank
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">{editingBank ? "Edit Bank Account" : "New Bank Account"}</h4>
            <button onClick={resetForm}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Bank Name (e.g., Bank of Maldives)"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="text"
              placeholder="Account Holder Name"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="text"
              placeholder="Account Number"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Branch (optional)"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="text"
                placeholder="SWIFT Code (optional)"
                value={formData.swift_code}
                onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                className="px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Active (visible to customers)</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "Saving..." : editingBank ? "Update Bank" : "Add Bank"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {banks.map((bank) => (
          <div key={bank.id} className="glass-card rounded-2xl p-4 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                bank.is_active ? "bg-mint/20" : "bg-muted"
              }`}>
                <Building2 className={`w-6 h-6 ${bank.is_active ? "text-mint" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground">{bank.bank_name}</h4>
                  {bank.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-mint/20 text-mint">Active</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{bank.account_name}</p>
                <p className="text-sm font-mono text-foreground mt-1 break-all">{bank.account_number}</p>
                {bank.branch && (
                  <p className="text-xs text-muted-foreground">Branch: {bank.branch}</p>
                )}
              </div>
              <div className="flex gap-2 ml-auto sm:ml-0">
                <button
                  onClick={() => handleEdit(bank)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(bank.id)}
                  className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {banks.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No bank accounts configured</p>
            <p className="text-sm text-muted-foreground">Add a bank account for customers to make transfers</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Bank Account?"
        description="Customers will no longer see this bank account for payments."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />

      {/* Card Types Section */}
      <div className="mt-8 pt-6 border-t border-border">
        <CardTypesTab />
      </div>
    </div>
  );
};

export default BankSettingsTab;
