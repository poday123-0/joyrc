
-- ============================================================
-- PHASE 1: POS Discount, Tax, Sales Returns, Customer Credit
-- ============================================================

-- 1) TAX CATEGORIES ------------------------------------------
CREATE TABLE public.tax_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active tax categories"
  ON public.tax_categories FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage tax categories"
  ON public.tax_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

CREATE TRIGGER trg_tax_categories_updated
  BEFORE UPDATE ON public.tax_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a 0% default
INSERT INTO public.tax_categories (name, rate, is_default) VALUES ('No Tax', 0, true);

-- Add tax assignment to products
ALTER TABLE public.products
  ADD COLUMN tax_category_id uuid REFERENCES public.tax_categories(id) ON DELETE SET NULL;

-- 2) ORDER LEVEL DISCOUNT + TAX ------------------------------
ALTER TABLE public.orders
  ADD COLUMN subtotal numeric(12,2) DEFAULT 0,
  ADD COLUMN discount_type text DEFAULT 'fixed' CHECK (discount_type IN ('fixed','percent')),
  ADD COLUMN discount_value numeric(12,2) DEFAULT 0,
  ADD COLUMN discount_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN tax_amount numeric(12,2) DEFAULT 0;

-- 3) ORDER ITEM LEVEL TAX + DISCOUNT -------------------------
ALTER TABLE public.order_items
  ADD COLUMN tax_rate numeric(5,2) DEFAULT 0,
  ADD COLUMN tax_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN discount_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN line_total numeric(12,2) DEFAULT 0;

-- 4) SALES RETURNS -------------------------------------------
CREATE TABLE public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  return_number text,
  reason text,
  notes text,
  total_refund numeric(12,2) NOT NULL DEFAULT 0,
  refund_method text DEFAULT 'cash',
  status text NOT NULL DEFAULT 'completed',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized can view returns"
  ON public.sales_returns FOR SELECT
  USING (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos') OR has_permission(auth.uid(),'tab_orders'));

CREATE POLICY "Authorized can manage returns"
  ON public.sales_returns FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos') OR has_permission(auth.uid(),'tab_orders'))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos') OR has_permission(auth.uid(),'tab_orders'));

CREATE TABLE public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  order_item_id uuid,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  color_id uuid,
  color_name text,
  quantity integer NOT NULL CHECK (quantity > 0),
  refund_amount numeric(12,2) NOT NULL DEFAULT 0,
  restock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized can view return items"
  ON public.sales_return_items FOR SELECT
  USING (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos') OR has_permission(auth.uid(),'tab_orders'));

CREATE POLICY "Authorized can manage return items"
  ON public.sales_return_items FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos') OR has_permission(auth.uid(),'tab_orders'))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos') OR has_permission(auth.uid(),'tab_orders'));

-- 5) CUSTOMER CREDIT ACCOUNTS --------------------------------
-- One account per customer (registered user OR walk-in by phone)
CREATE TABLE public.customer_credit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_name text NOT NULL,
  customer_phone text,
  prepaid_balance numeric(12,2) NOT NULL DEFAULT 0,  -- store credit they HAVE
  owed_balance numeric(12,2) NOT NULL DEFAULT 0,     -- credit they OWE the shop
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (customer_phone)
);

ALTER TABLE public.customer_credit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized can view credit accounts"
  ON public.customer_credit_accounts FOR SELECT
  USING (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos') OR auth.uid() = user_id);

CREATE POLICY "Authorized can manage credit accounts"
  ON public.customer_credit_accounts FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos'))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos'));

CREATE TRIGGER trg_credit_accounts_updated
  BEFORE UPDATE ON public.customer_credit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Credit log: every movement
CREATE TABLE public.customer_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.customer_credit_accounts(id) ON DELETE CASCADE,
  -- topup: customer adds prepaid balance (+prepaid)
  -- spend_prepaid: customer pays from prepaid (-prepaid)
  -- sale_on_credit: customer takes goods on credit (+owed)
  -- repayment: customer repays owed (-owed)
  -- adjustment: manual admin adjustment (any direction)
  type text NOT NULL CHECK (type IN ('topup','spend_prepaid','sale_on_credit','repayment','adjustment')),
  amount numeric(12,2) NOT NULL,
  order_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized can view credit transactions"
  ON public.customer_credit_transactions FOR SELECT
  USING (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos')
         OR EXISTS (SELECT 1 FROM public.customer_credit_accounts a
                    WHERE a.id = account_id AND a.user_id = auth.uid()));

CREATE POLICY "Authorized can manage credit transactions"
  ON public.customer_credit_transactions FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos'))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(),'tab_pos'));

CREATE INDEX idx_credit_tx_account ON public.customer_credit_transactions(account_id, created_at DESC);
CREATE INDEX idx_return_items_return ON public.sales_return_items(return_id);
CREATE INDEX idx_returns_order ON public.sales_returns(order_id);

-- 6) Add 'credit' as a payment method option (orders.payment_method is free text - no schema change needed)
-- 7) Allow 'returned' / 'partially_returned' on orders.status (free text - no constraint)
