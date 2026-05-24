BEGIN;

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sales" ON public.sales FOR INSERT WITH CHECK (true);

ALTER TABLE public.sales ALTER COLUMN items SET DEFAULT '[]'::jsonb;

ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

COMMIT;
