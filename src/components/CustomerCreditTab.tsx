import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw, X, User, Phone, History, AlertCircle } from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface CreditAccount {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  prepaid_balance: number;
  owed_balance: number;
  notes: string | null;
  created_at: string;
}

interface CreditTx {
  id: string;
  account_id: string;
  type: "topup" | "spend_prepaid" | "sale_on_credit" | "repayment" | "adjustment";
  amount: number;
  order_id: string | null;
  notes: string | null;
  created_at: string;
}

const txLabel: Record<CreditTx["type"], string> = {
  topup: "Top-up (prepaid)",
  spend_prepaid: "Spent (prepaid)",
  sale_on_credit: "Sale on credit",
  repayment: "Repayment",
  adjustment: "Adjustment",
};

const CustomerCreditTab = () => {
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CreditAccount | null>(null);
  const [history, setHistory] = useState<CreditTx[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ customer_name: "", customer_phone: "", notes: "" });
  const [movement, setMovement] = useState<{ type: CreditTx["type"]; amount: string; notes: string } | null>(null);

  const fetchAccounts = async () => {
    const { data } = await supabase.from("customer_credit_accounts").select("*").order("created_at", { ascending: false });
    setAccounts((data as CreditAccount[]) || []);
    setLoading(false);
  };

  const fetchHistory = async (accountId: string) => {
    const { data } = await supabase
      .from("customer_credit_transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    setHistory((data as CreditTx[]) || []);
  };

  useEffect(() => { fetchAccounts(); }, []);
  useRealtimeSubscription(["customer_credit_accounts", "customer_credit_transactions"], () => {
    fetchAccounts();
    if (selected) fetchHistory(selected.id);
  });

  useEffect(() => {
    if (selected) fetchHistory(selected.id);
  }, [selected?.id]);

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    return !q || a.customer_name.toLowerCase().includes(q) || (a.customer_phone || "").includes(q);
  });

  const totalOwed = accounts.reduce((s, a) => s + Number(a.owed_balance), 0);
  const totalPrepaid = accounts.reduce((s, a) => s + Number(a.prepaid_balance), 0);

  const createAccount = async () => {
    if (!newForm.customer_name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const { error } = await supabase.from("customer_credit_accounts").insert({
      customer_name: newForm.customer_name.trim(),
      customer_phone: newForm.customer_phone.trim() || null,
      notes: newForm.notes.trim() || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Account created" });
    setShowNew(false);
    setNewForm({ customer_name: "", customer_phone: "", notes: "" });
  };

  const recordMovement = async () => {
    if (!selected || !movement) return;
    const amt = parseFloat(movement.amount);
    if (!amt || amt <= 0) { toast({ title: "Enter a positive amount", variant: "destructive" }); return; }

    const { data: { user } } = await supabase.auth.getUser();

    // Insert transaction log
    const { error: txError } = await supabase.from("customer_credit_transactions").insert({
      account_id: selected.id,
      type: movement.type,
      amount: amt,
      notes: movement.notes.trim() || null,
      created_by: user?.id || null,
    });
    if (txError) { toast({ title: "Error", description: txError.message, variant: "destructive" }); return; }

    // Update balances
    let newPrepaid = Number(selected.prepaid_balance);
    let newOwed = Number(selected.owed_balance);
    if (movement.type === "topup") newPrepaid += amt;
    else if (movement.type === "spend_prepaid") newPrepaid = Math.max(0, newPrepaid - amt);
    else if (movement.type === "sale_on_credit") newOwed += amt;
    else if (movement.type === "repayment") newOwed = Math.max(0, newOwed - amt);
    // adjustment: leave to admin via notes; we won't auto-apply it (treat as manual log)

    if (movement.type !== "adjustment") {
      await supabase.from("customer_credit_accounts").update({
        prepaid_balance: newPrepaid,
        owed_balance: newOwed,
      }).eq("id", selected.id);
    }

    // If a repayment, also record an income transaction
    if (movement.type === "repayment") {
      await supabase.from("transactions").insert({
        type: "income",
        category: "Credit Repayment",
        amount: amt,
        description: `Repayment from ${selected.customer_name}${movement.notes ? ` - ${movement.notes}` : ""}`,
        added_by: user?.id || null,
      });
    }

    toast({ title: "Recorded" });
    setMovement(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Customer Credit</h2>
          <p className="text-xs text-muted-foreground">Prepaid balances and outstanding credit owed by customers.</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1" /> New Account</Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Owed to Shop</p>
          <p className="text-lg font-bold text-destructive">{formatMVR(totalOwed)}</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Prepaid</p>
          <p className="text-lg font-bold text-primary">{formatMVR(totalPrepaid)}</p>
        </div>
      </div>

      <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="grid gap-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground italic">No customer credit accounts.</p>}
        {filtered.map(a => (
          <button key={a.id} onClick={() => setSelected(a)} className="w-full text-left p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-primary" /></div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{a.customer_name}</p>
                  {a.customer_phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {a.customer_phone}</p>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-muted-foreground">Owes</p>
                <p className={`text-sm font-bold ${Number(a.owed_balance) > 0 ? "text-destructive" : "text-muted-foreground"}`}>{formatMVR(Number(a.owed_balance))}</p>
                {Number(a.prepaid_balance) > 0 && <p className="text-[10px] text-primary">+{formatMVR(Number(a.prepaid_balance))} prepaid</p>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* New account modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">New Credit Account</h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
            </div>
            <div><Label className="text-xs">Name</Label><Input value={newForm.customer_name} onChange={e => setNewForm({ ...newForm, customer_name: e.target.value })} /></div>
            <div><Label className="text-xs">Phone</Label><Input value={newForm.customer_phone} onChange={e => setNewForm({ ...newForm, customer_phone: e.target.value })} /></div>
            <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} /></div>
            <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button><Button className="flex-1" onClick={createAccount}>Create</Button></div>
          </div>
        </div>
      )}

      {/* Account detail */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selected.customer_name}</h3>
                {selected.customer_phone && <p className="text-xs text-muted-foreground">{selected.customer_phone}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-[10px] text-muted-foreground uppercase">Owed</p>
                <p className="text-lg font-bold text-destructive">{formatMVR(Number(selected.owed_balance))}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-[10px] text-muted-foreground uppercase">Prepaid</p>
                <p className="text-lg font-bold text-primary">{formatMVR(Number(selected.prepaid_balance))}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setMovement({ type: "topup", amount: "", notes: "" })}><ArrowDownCircle className="w-4 h-4 mr-1" /> Top-up</Button>
              <Button variant="outline" size="sm" onClick={() => setMovement({ type: "repayment", amount: "", notes: "" })}><ArrowUpCircle className="w-4 h-4 mr-1" /> Repayment</Button>
              <Button variant="outline" size="sm" onClick={() => setMovement({ type: "sale_on_credit", amount: "", notes: "" })}><AlertCircle className="w-4 h-4 mr-1" /> Add Credit Sale</Button>
              <Button variant="outline" size="sm" onClick={() => setMovement({ type: "adjustment", amount: "", notes: "" })}><RefreshCw className="w-4 h-4 mr-1" /> Note</Button>
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold flex items-center gap-1 mb-2"><History className="w-3.5 h-3.5" /> History</p>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {history.length === 0 && <p className="text-xs text-muted-foreground italic">No transactions yet.</p>}
                {history.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{txLabel[t.type]}</p>
                      {t.notes && <p className="text-muted-foreground truncate">{t.notes}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <p className={`font-bold ${t.type === "sale_on_credit" || t.type === "topup" ? "text-primary" : "text-foreground"}`}>{formatMVR(Number(t.amount))}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movement modal */}
      {movement && selected && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-sm space-y-3">
            <h3 className="font-semibold">{txLabel[movement.type]}</h3>
            <div><Label className="text-xs">Amount (MVR)</Label><Input type="number" step="0.01" value={movement.amount} onChange={e => setMovement({ ...movement, amount: e.target.value })} autoFocus /></div>
            <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={movement.notes} onChange={e => setMovement({ ...movement, notes: e.target.value })} /></div>
            <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setMovement(null)}>Cancel</Button><Button className="flex-1" onClick={recordMovement}>Record</Button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCreditTab;
