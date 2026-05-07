import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMVR } from "@/lib/currency";
import { RotateCcw, Wallet, Package } from "lucide-react";

interface ReturnRow {
  id: string;
  return_number: string | null;
  order_id: string;
  total_refund: number;
  refund_method: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  order_number?: string | null;
  items?: { id: string; product_name: string; color_name: string | null; quantity: number; refund_amount: number }[];
}

interface CreditAccount {
  id: string;
  customer_name: string;
  owed_balance: number;
  prepaid_balance: number;
  notes: string | null;
}

interface CreditTx {
  id: string;
  account_id: string;
  type: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

const CustomerReturnsTab = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [txs, setTxs] = useState<CreditTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      // Returns: only those where order belongs to this user
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number")
        .eq("user_id", user.id);
      const orderIds = (orders || []).map((o) => o.id);
      const orderNumMap: Record<string, string | null> = {};
      (orders || []).forEach((o) => { orderNumMap[o.id] = o.order_number; });

      let returnRows: ReturnRow[] = [];
      if (orderIds.length > 0) {
        const { data: rData } = await supabase
          .from("sales_returns")
          .select("*")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });
        const rIds = (rData || []).map((r) => r.id);
        let itemsByReturn: Record<string, ReturnRow["items"]> = {};
        if (rIds.length > 0) {
          const { data: itemsData } = await supabase
            .from("sales_return_items")
            .select("id, return_id, product_name, color_name, quantity, refund_amount")
            .in("return_id", rIds);
          (itemsData || []).forEach((it: any) => {
            (itemsByReturn[it.return_id] ||= []).push({
              id: it.id,
              product_name: it.product_name,
              color_name: it.color_name,
              quantity: it.quantity,
              refund_amount: Number(it.refund_amount || 0),
            });
          });
        }
        returnRows = (rData || []).map((r: any) => ({
          ...r,
          order_number: orderNumMap[r.order_id] || null,
          items: itemsByReturn[r.id] || [],
        }));
      }
      setReturns(returnRows);

      // Credit accounts linked to this user
      const { data: accData } = await supabase
        .from("customer_credit_accounts")
        .select("*")
        .eq("user_id", user.id);
      setAccounts((accData as any) || []);

      const accIds = (accData || []).map((a: any) => a.id);
      if (accIds.length > 0) {
        const { data: txData } = await supabase
          .from("customer_credit_transactions")
          .select("id, account_id, type, amount, notes, created_at")
          .in("account_id", accIds)
          .order("created_at", { ascending: false });
        setTxs((txData as any) || []);
      } else {
        setTxs([]);
      }

      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalOwed = accounts.reduce((s, a) => s + Number(a.owed_balance || 0), 0);
  const totalPrepaid = accounts.reduce((s, a) => s + Number(a.prepaid_balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Credit Summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">My Credit & Balance</h3>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credit account on file.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-muted-foreground">Prepaid Balance</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatMVR(totalPrepaid)}</p>
              </div>
              <div className="rounded-2xl p-4 bg-coral/10 border border-coral/20">
                <p className="text-xs text-muted-foreground">You Owe</p>
                <p className="text-xl font-bold text-coral">{formatMVR(totalOwed)}</p>
              </div>
            </div>
            {txs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Recent Activity</p>
                {txs.slice(0, 10).map((t) => (
                  <div key={t.id} className="flex justify-between items-center bg-muted/30 rounded-xl px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium capitalize text-foreground">{t.type.replace(/_/g, " ")}</p>
                      {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="font-semibold text-foreground">{formatMVR(Number(t.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Returns */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">My Returns</h3>
        </div>
        {returns.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No returns yet.
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {r.return_number || `Return #${r.id.slice(0, 8).toUpperCase()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Order {r.order_number || `#${r.order_id.slice(0, 8).toUpperCase()}`} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatMVR(Number(r.total_refund))}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.refund_method || "—"}</p>
                  </div>
                </div>
                {r.reason && (
                  <p className="text-xs text-muted-foreground mb-2">Reason: {r.reason}</p>
                )}
                {r.items && r.items.length > 0 && (
                  <div className="border-t border-border pt-2 space-y-1">
                    {r.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">
                          {it.product_name}{it.color_name ? ` · ${it.color_name}` : ""} × {it.quantity}
                        </span>
                        <span className="font-medium text-foreground">{formatMVR(it.refund_amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize text-muted-foreground">
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerReturnsTab;
