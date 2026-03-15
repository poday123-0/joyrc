
-- Loans table
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_settled BOOLEAN NOT NULL DEFAULT false
);

-- Loan payments table
CREATE TABLE public.loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for loans
CREATE POLICY "Admins and staff can manage loans" ON public.loans
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_loans'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_loans'::text));

-- RLS policies for loan_payments
CREATE POLICY "Admins and staff can manage loan payments" ON public.loan_payments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_loans'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_loans'::text));

-- Updated_at trigger
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
