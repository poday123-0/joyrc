import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RotateCcw, Search, X, Receipt, Package } from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface Order {
  id: string;
  order_number: string | null;
  total_amount: number;
  created_at: string;
  status: string;
  user_id: string;
  phone: string | null;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  color_id: string | null;
  color_name: string | null;
}

interface ReturnRow {
  id: string;
  order_id: string;
  return_number: string | null;
  reason: string | null;
  total_refund: number;
  refund_method: string | null;
  status: string;
  created_at: string;
}

const SalesReturnsTab = () => {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [processing, setProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchReturns = async () => {
    const { data } = await supabase.from("sales_returns").select("*").order("created_at", { ascending: false }).limit(100);
    setReturns((data as ReturnRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchReturns(); }, []);
  useRealtimeSubscription(["sales_returns", "sales_return_items"], fetchReturns);

  const lookupOrder = async () => {
    const q = orderSearch.trim();
    if (!q) return;
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, created_at, status, user_id, phone")
      .or(`order_number.ilike.%${q}%,id.eq.${q.length === 36 ? q : "00000000-0000-0000-0000-000000000000"}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) { toast({ title: "Order not found", variant: "destructive" }); return; }
    setFoundOrder(data as Order);
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", data.id);
    setOrderItems((items as OrderItem[]) || []);
    const initQty: Record<string, number> = {};
    const initRestock: Record<string, boolean> = {};
    (items || []).forEach((i: any) => { initQty[i.id] = 0; initRestock[i.id] = true; });
    setReturnQty(initQty);
    setRestock(initRestock);
  };

  const totalRefund = orderItems.reduce((s, i) => s + (returnQty[i.id] || 0) * Number(i.product_price), 0);

  const submitReturn = async () => {
    if (!foundOrder) return;
    const lines = orderItems.filter(i => (returnQty[i.id] || 0) > 0);
    if (lines.length === 0) { toast({ title: "Select at least one item to return", variant: "destructive" }); return; }
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: ret, error: retErr } = await supabase.from("sales_returns").insert({
        order_id: foundOrder.id,
        reason: reason.trim() || null,
        total_refund: totalRefund,
        refund_method: refundMethod,
        status: "completed",
        created_by: user?.id || null,
        return_number: `RET-${Date.now().toString().slice(-8)}`,
      }).select().single();
      if (retErr) throw retErr;

      const itemsPayload = lines.map(i => ({
        return_id: ret.id,
        order_item_id: i.id,
        product_id: i.product_id,
        product_name: i.product_name,
        color_id: i.color_id,
        color_name: i.color_name,
        quantity: returnQty[i.id],
        refund_amount: returnQty[i.id] * Number(i.product_price),
        restock: restock[i.id] !== false,
      }));
      const { error: itemsErr } = await supabase.from("sales_return_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      // Restock per line + stock history
      for (const line of itemsPayload) {
        if (!line.restock) continue;
        const { data: prod } = await supabase.from("products").select("stock_quantity").eq("id", line.product_id).maybeSingle();
        const prev = prod?.stock_quantity ?? 0;
        const newQty = prev + line.quantity;
        await supabase.from("products").update({ stock_quantity: newQty, in_stock: newQty > 0 }).eq("id", line.product_id);

        if (line.color_id) {
          const { data: col } = await supabase.from("product_colors").select("stock_quantity").eq("id", line.color_id).maybeSingle();
          await supabase.from("product_colors").update({ stock_quantity: (col?.stock_quantity ?? 0) + line.quantity }).eq("id", line.color_id);
        }

        await supabase.from("stock_history").insert({
          product_id: line.product_id,
          previous_quantity: prev,
          new_quantity: newQty,
          change_amount: line.quantity,
          change_type: "return",
          notes: `Return ${ret.return_number} - Order ${foundOrder.order_number || foundOrder.id.slice(0, 8)}${line.color_name ? ` (${line.color_name})` : ""}`,
          order_id: foundOrder.id,
          created_by: user?.id || null,
        });
      }

      // Refund expense transaction
      await supabase.from("transactions").insert({
        type: "expense",
        category: "Sales Refund",
        amount: totalRefund,
        description: `Refund - ${ret.return_number} - Order ${foundOrder.order_number || foundOrder.id.slice(0, 8)}${reason ? ` - ${reason}` : ""}`,
        order_id: foundOrder.id,
        added_by: user?.id || null,
      });

      // Mark order partially / fully returned
      const totalQty = orderItems.reduce((s, i) => s + i.quantity, 0);
      const returnedQty = lines.reduce((s, l) => s + l.quantity, 0);
      const newStatus = returnedQty >= totalQty ? "returned" : "partially_returned";
      await supabase.from("orders").update({ status: newStatus }).eq("id", foundOrder.id);

      toast({ title: "Return processed", description: `${formatMVR(totalRefund)} refunded` });
      setShowForm(false);
      setFoundOrder(null);
      setOrderItems([]);
      setReturnQty({});
      setReason("");
      setOrderSearch("");
      fetchReturns();
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Sales Returns</h2>
          <p className="text-xs text-muted-foreground">Process full or partial returns from any sale.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><RotateCcw className="w-4 h-4 mr-1" /> New Return</Button>
      </div>

      <div className="grid gap-2">
        {returns.length === 0 && <p className="text-sm text-muted-foreground italic">No returns yet.</p>}
        {returns.map(r => (
          <div key={r.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> {r.return_number || r.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
              {r.reason && <p className="text-xs text-muted-foreground truncate italic">"{r.reason}"</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-destructive">-{formatMVR(Number(r.total_refund))}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{r.refund_method}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">New Sales Return</h3>
              <button onClick={() => { setShowForm(false); setFoundOrder(null); }} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <Label className="text-xs">Order Number or ID</Label>
              <div className="flex gap-2">
                <Input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="e.g. RCJOY/26/05/00012" />
                <Button onClick={lookupOrder} variant="outline"><Search className="w-4 h-4" /></Button>
              </div>
            </div>

            {foundOrder && (
              <>
                <div className="p-2 rounded-lg bg-muted/40 text-xs">
                  <p><strong>{foundOrder.order_number || foundOrder.id.slice(0, 8)}</strong> · {new Date(foundOrder.created_at).toLocaleDateString()}</p>
                  <p className="text-muted-foreground">Total: {formatMVR(Number(foundOrder.total_amount))}</p>
                </div>

                <div className="space-y-1.5">
                  {orderItems.map(i => (
                    <div key={i.id} className="p-2 rounded-lg border border-border">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {i.product_name}{i.color_name && <span className="text-xs text-muted-foreground">({i.color_name})</span>}</p>
                        <p className="text-xs text-muted-foreground">x{i.quantity} · {formatMVR(Number(i.product_price))}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div>
                          <Label className="text-[10px]">Return qty</Label>
                          <Input type="number" min="0" max={i.quantity} value={returnQty[i.id] || 0}
                            onChange={e => setReturnQty({ ...returnQty, [i.id]: Math.max(0, Math.min(i.quantity, parseInt(e.target.value) || 0)) })}
                            className="h-8 text-sm" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-[10px]">Restock</Label>
                          <Switch checked={restock[i.id] !== false} onCheckedChange={v => setRestock({ ...restock, [i.id]: v })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div><Label className="text-xs">Reason</Label><Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Refund Method</Label>
                  <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="store_credit">Store Credit</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10">
                  <span className="text-sm font-semibold">Refund Total</span>
                  <span className="text-lg font-bold text-primary">{formatMVR(totalRefund)}</span>
                </div>

                <Button onClick={submitReturn} disabled={processing || totalRefund <= 0} className="w-full">
                  {processing ? "Processing..." : "Process Return"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReturnsTab;
