import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatMVR } from "@/lib/currency";
import {
  ArrowDownRight, ArrowUpRight, Wallet, Banknote, Building2,
  TrendingUp, TrendingDown, Scale, BookOpen, CreditCard,
} from "lucide-react";

type Tx = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  created_at: string;
};

type Loan = { id: string; lender_name: string; total_amount: number; is_settled: boolean };
type LoanPayment = { id: string; loan_id: string; amount: number };
type Credit = { id: string; customer_name: string; owed_balance: number; prepaid_balance: number };

type Period = "all" | "month" | "year";

const StatCard = ({
  icon: Icon, label, value, hint, tone = "default",
}: {
  icon: any; label: string; value: string; hint?: string;
  tone?: "default" | "income" | "expense" | "asset" | "liability";
}) => {
  const toneClass = {
    default: "text-foreground",
    income: "text-emerald-600 dark:text-emerald-400",
    expense: "text-rose-600 dark:text-rose-400",
    asset: "text-sky-600 dark:text-sky-400",
    liability: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div className="glass-card rounded-2xl p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
};

const AccountsTab = () => {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");

  const fetchAll = async () => {
    const [{ data: tx }, { data: ln }, { data: lp }, { data: cc }] = await Promise.all([
      supabase.from("transactions").select("id, type, category, amount, created_at"),
      supabase.from("loans").select("id, lender_name, total_amount, is_settled"),
      supabase.from("loan_payments").select("id, loan_id, amount"),
      supabase.from("customer_credit_accounts").select("id, customer_name, owed_balance, prepaid_balance"),
    ]);
    setTransactions((tx as any) || []);
    setLoans((ln as any) || []);
    setLoanPayments((lp as any) || []);
    setCredits((cc as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);
  useRealtimeSubscription("transactions", fetchAll, "rt-acc-tx");
  useRealtimeSubscription("loans", fetchAll, "rt-acc-loans");
  useRealtimeSubscription("loan_payments", fetchAll, "rt-acc-lp");
  useRealtimeSubscription("customer_credit_accounts", fetchAll, "rt-acc-cc");

  const filteredTx = useMemo(() => {
    if (period === "all") return transactions;
    const now = new Date();
    const start = period === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1);
    return transactions.filter((t) => new Date(t.created_at) >= start);
  }, [transactions, period]);

  const totals = useMemo(() => {
    const income = filteredTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = filteredTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [filteredTx]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { type: "income" | "expense"; total: number; count: number }>();
    for (const t of filteredTx) {
      const key = `${t.type}::${t.category}`;
      const cur = map.get(key) || { type: t.type, total: 0, count: 0 };
      cur.total += Number(t.amount || 0);
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({ category: k.split("::")[1], ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTx]);

  const balances = useMemo(() => {
    // Receivables = sum of owed_balance (customers owe us)
    const receivables = credits.reduce((s, c) => s + Number(c.owed_balance || 0), 0);
    // Customer prepaid (we owe them store credit) = liability
    const customerPrepaid = credits.reduce((s, c) => s + Number(c.prepaid_balance || 0), 0);
    // Loans outstanding = total - payments on unsettled loans
    const paymentsByLoan = new Map<string, number>();
    loanPayments.forEach((p) => paymentsByLoan.set(p.loan_id, (paymentsByLoan.get(p.loan_id) || 0) + Number(p.amount)));
    const loansOutstanding = loans
      .filter((l) => !l.is_settled)
      .reduce((s, l) => s + Math.max(0, Number(l.total_amount) - (paymentsByLoan.get(l.id) || 0)), 0);

    // Cash position (all-time): income - expenses - loan payments + new loans
    const allIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const allExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalLoansIn = loans.reduce((s, l) => s + Number(l.total_amount || 0), 0);
    const totalLoanPayments = loanPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const cash = allIncome - allExpense + totalLoansIn - totalLoanPayments;

    return {
      receivables, customerPrepaid, loansOutstanding, cash,
      assets: cash + receivables,
      liabilities: customerPrepaid + loansOutstanding,
    };
  }, [credits, loans, loanPayments, transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const periodLabel = period === "all" ? "All time" : period === "month" ? "This month" : "This year";

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="glass-card rounded-2xl p-2 shadow-soft flex gap-1">
        {(["month", "year", "all"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
              period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {p === "all" ? "All time" : `This ${p}`}
          </button>
        ))}
      </div>

      {/* Profit & Loss */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Profit &amp; Loss · {periodLabel}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={TrendingUp} label="Income" value={formatMVR(totals.income)} tone="income" />
          <StatCard icon={TrendingDown} label="Expenses" value={formatMVR(totals.expense)} tone="expense" />
          <StatCard
            icon={Scale}
            label="Net Profit"
            value={formatMVR(totals.net)}
            tone={totals.net >= 0 ? "income" : "expense"}
          />
        </div>
      </div>

      {/* Balance Sheet */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Scale className="w-4 h-4" /> Balance · Live
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={Banknote} label="Cash on Hand" value={formatMVR(balances.cash)} tone="asset"
            hint="Income − Expenses + Loans − Loan Repayments" />
          <StatCard icon={Wallet} label="Receivables" value={formatMVR(balances.receivables)} tone="asset"
            hint="Customers owe you" />
          <StatCard icon={Building2} label="Loans Outstanding" value={formatMVR(balances.loansOutstanding)} tone="liability"
            hint="You owe lenders" />
          <StatCard icon={CreditCard} label="Customer Prepaid" value={formatMVR(balances.customerPrepaid)} tone="liability"
            hint="Store credit owed to customers" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <StatCard icon={ArrowUpRight} label="Total Assets" value={formatMVR(balances.assets)} tone="asset" />
          <StatCard icon={ArrowDownRight} label="Total Liabilities" value={formatMVR(balances.liabilities)} tone="liability" />
          <StatCard
            icon={Scale}
            label="Equity"
            value={formatMVR(balances.assets - balances.liabilities)}
            tone={balances.assets - balances.liabilities >= 0 ? "income" : "expense"}
          />
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">By Category · {periodLabel}</h3>
        {byCategory.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-sm text-muted-foreground shadow-soft">
            No transactions in this period.
          </div>
        ) : (
          <div className="space-y-1.5">
            {byCategory.map((c) => {
              const isIncome = c.type === "income";
              const denom = isIncome ? totals.income : totals.expense;
              const pct = denom > 0 ? (c.total / denom) * 100 : 0;
              return (
                <div key={`${c.type}-${c.category}`} className="glass-card rounded-xl p-3 shadow-soft">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isIncome
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{c.category}</div>
                        <div className="text-[11px] text-muted-foreground">{c.count} entries</div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {formatMVR(c.total)}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={`h-full ${isIncome ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsTab;
