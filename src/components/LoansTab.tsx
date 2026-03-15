import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Wallet, CheckCircle2, Clock, ChevronDown, ChevronUp, Banknote, Trash2, X
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Loan {
  id: string;
  lender_name: string;
  total_amount: number;
  notes: string | null;
  transaction_id: string | null;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
}

interface LoanPayment {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

const LoansTab = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Record<string, LoanPayment[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  
  // Add loan form
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [lenderName, setLenderName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  
  // Add payment form
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  
  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: "loan" | "payment"; id: string } | null>(null);

  const fetchLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .order("is_settled", { ascending: true })
      .order("created_at", { ascending: false });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLoans((data as unknown as Loan[]) || []);
    }
    setLoading(false);
  };

  const fetchPayments = async (loanId: string) => {
    const { data, error } = await supabase
      .from("loan_payments")
      .select("*")
      .eq("loan_id", loanId)
      .order("payment_date", { ascending: false });
    
    if (!error && data) {
      setPayments(prev => ({ ...prev, [loanId]: data as unknown as LoanPayment[] }));
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  const getTotalRepaid = (loanId: string) => {
    return (payments[loanId] || []).reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const getBalance = (loan: Loan) => {
    return Number(loan.total_amount) - getTotalRepaid(loan.id);
  };

  const handleAddLoan = async () => {
    if (!lenderName.trim() || !loanAmount) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("loans").insert({
      lender_name: lenderName.trim(),
      total_amount: parseFloat(loanAmount),
      notes: loanNotes.trim() || null,
      created_by: user?.id,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Loan added" });
      setShowAddLoan(false);
      setLenderName("");
      setLoanAmount("");
      setLoanNotes("");
      fetchLoans();
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || !paymentLoanId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("loan_payments").insert({
      loan_id: paymentLoanId,
      amount: parseFloat(paymentAmount),
      notes: paymentNotes.trim() || null,
      created_by: user?.id,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment recorded" });
      setShowAddPayment(false);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentLoanId("");
      fetchPayments(paymentLoanId);
      
      // Check if fully repaid
      const loan = loans.find(l => l.id === paymentLoanId);
      if (loan) {
        const totalRepaid = getTotalRepaid(paymentLoanId) + parseFloat(paymentAmount);
        if (totalRepaid >= Number(loan.total_amount)) {
          await supabase.from("loans").update({ is_settled: true } as any).eq("id", paymentLoanId);
          fetchLoans();
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === "loan") {
      const { error } = await supabase.from("loans").delete().eq("id", deleteTarget.id);
      if (!error) {
        toast({ title: "Loan deleted" });
        fetchLoans();
      }
    } else {
      const payment = Object.values(payments).flat().find(p => p.id === deleteTarget.id);
      const { error } = await supabase.from("loan_payments").delete().eq("id", deleteTarget.id);
      if (!error) {
        toast({ title: "Payment deleted" });
        if (payment) fetchPayments(payment.loan_id);
      }
    }
    setDeleteTarget(null);
  };

  const handleToggleSettle = async (loan: Loan) => {
    const { error } = await supabase
      .from("loans")
      .update({ is_settled: !loan.is_settled } as any)
      .eq("id", loan.id);
    if (!error) fetchLoans();
  };

  const toggleExpand = (loanId: string) => {
    if (expandedLoan === loanId) {
      setExpandedLoan(null);
    } else {
      setExpandedLoan(loanId);
      if (!payments[loanId]) fetchPayments(loanId);
    }
  };

  const totalBorrowed = loans.reduce((s, l) => s + Number(l.total_amount), 0);
  const activeLoans = loans.filter(l => !l.is_settled);
  const settledLoans = loans.filter(l => l.is_settled);
  const totalOutstanding = activeLoans.reduce((s, l) => s + Number(l.total_amount), 0) - 
    activeLoans.reduce((s, l) => s + getTotalRepaid(l.id), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Total Borrowed</p>
          <p className="text-sm font-bold text-foreground mt-0.5">{formatMVR(totalBorrowed)}</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Active Loans</p>
          <p className="text-sm font-bold text-foreground mt-0.5">{activeLoans.length}</p>
        </div>
        <div className="bg-destructive/10 rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase text-destructive font-medium">Outstanding</p>
          <p className="text-sm font-bold text-destructive mt-0.5">{formatMVR(totalOutstanding)}</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase text-primary font-medium">Settled</p>
          <p className="text-sm font-bold text-primary mt-0.5">{settledLoans.length}</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAddLoan(true)} className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Loan
        </Button>
      </div>

      {/* Loans List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
      ) : loans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No loans recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {loans.map(loan => {
            const repaid = getTotalRepaid(loan.id);
            const balance = Number(loan.total_amount) - repaid;
            const progress = Number(loan.total_amount) > 0 ? (repaid / Number(loan.total_amount)) * 100 : 0;
            const isExpanded = expandedLoan === loan.id;

            return (
              <div key={loan.id} className={`border rounded-xl overflow-hidden transition-all ${loan.is_settled ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
                {/* Loan Header */}
                <button
                  onClick={() => toggleExpand(loan.id)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${loan.is_settled ? 'bg-primary/20' : 'bg-muted'}`}>
                    {loan.is_settled ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{loan.lender_name}</span>
                      {loan.is_settled && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">Settled</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">Borrowed: {formatMVR(loan.total_amount)}</span>
                      {!loan.is_settled && (
                        <span className="text-xs font-medium text-destructive">Balance: {formatMVR(balance)}</span>
                      )}
                    </div>
                    {/* Progress bar */}
                    {!loan.is_settled && (
                      <div className="w-full h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border/50 space-y-2">
                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {!loan.is_settled && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={(e) => { e.stopPropagation(); setPaymentLoanId(loan.id); setShowAddPayment(true); }}
                        >
                          <Banknote className="w-3 h-3 mr-1" /> Record Payment
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={loan.is_settled ? "outline" : "default"}
                        className="h-7 text-[11px]"
                        onClick={(e) => { e.stopPropagation(); handleToggleSettle(loan); }}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {loan.is_settled ? "Reopen" : "Mark Settled"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-destructive hover:text-destructive ml-auto"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "loan", id: loan.id }); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {loan.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">{loan.notes}</p>
                    )}

                    {/* Repayment Summary */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Borrowed</p>
                        <p className="text-xs font-bold">{formatMVR(loan.total_amount)}</p>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-2">
                        <p className="text-[10px] text-primary">Repaid</p>
                        <p className="text-xs font-bold text-primary">{formatMVR(repaid)}</p>
                      </div>
                      <div className={`rounded-lg p-2 ${balance > 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                        <p className="text-[10px] text-muted-foreground">Balance</p>
                        <p className={`text-xs font-bold ${balance > 0 ? 'text-destructive' : 'text-primary'}`}>{formatMVR(balance)}</p>
                      </div>
                    </div>

                    {/* Payment History */}
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Payment History</p>
                      {!payments[loan.id] ? (
                        <p className="text-xs text-muted-foreground">Loading...</p>
                      ) : payments[loan.id].length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No payments yet</p>
                      ) : (
                        <div className="space-y-1">
                          {payments[loan.id].map(payment => (
                            <div key={payment.id} className="flex items-center gap-2 bg-muted/20 rounded-lg p-2">
                              <Banknote className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-foreground">{formatMVR(payment.amount)}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                  </span>
                                </div>
                                {payment.notes && <p className="text-[10px] text-muted-foreground truncate">{payment.notes}</p>}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "payment", id: payment.id }); }}
                                className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Added {new Date(loan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Loan Sheet */}
      <Sheet open={showAddLoan} onOpenChange={setShowAddLoan}>
        <SheetContent side="right" className="w-[340px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-base">Add Loan</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div>
              <label className="text-xs font-medium text-foreground">Lender Name *</label>
              <Input value={lenderName} onChange={e => setLenderName(e.target.value)} placeholder="Who did you borrow from?" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Amount *</label>
              <Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="0.00" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Notes</label>
              <Input value={loanNotes} onChange={e => setLoanNotes(e.target.value)} placeholder="Optional notes..." className="mt-1 h-9 text-sm" />
            </div>
            <Button onClick={handleAddLoan} disabled={!lenderName.trim() || !loanAmount} className="w-full">
              Add Loan
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Record Payment Sheet */}
      <Sheet open={showAddPayment} onOpenChange={setShowAddPayment}>
        <SheetContent side="right" className="w-[340px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-base">Record Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            {paymentLoanId && (
              <div className="bg-muted/40 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Paying back:</p>
                <p className="text-sm font-semibold">{loans.find(l => l.id === paymentLoanId)?.lender_name}</p>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-foreground">Amount *</label>
              <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Notes</label>
              <Input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Optional notes..." className="mt-1 h-9 text-sm" />
            </div>
            <Button onClick={handleAddPayment} disabled={!paymentAmount} className="w-full">
              Record Payment
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === "loan" ? "Loan" : "Payment"}?`}
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default LoansTab;
