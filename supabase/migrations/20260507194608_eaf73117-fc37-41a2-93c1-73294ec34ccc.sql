
-- Allow customers to view their own sales returns and return items
CREATE POLICY "Customers can view their own returns"
ON public.sales_returns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = sales_returns.order_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view their own return items"
ON public.sales_return_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.sales_returns sr
    JOIN public.orders o ON o.id = sr.order_id
    WHERE sr.id = sales_return_items.return_id
      AND o.user_id = auth.uid()
  )
);
