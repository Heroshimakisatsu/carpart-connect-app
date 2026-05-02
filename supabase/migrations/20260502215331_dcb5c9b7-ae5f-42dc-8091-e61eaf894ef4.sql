
CREATE TABLE public.parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER NOT NULL DEFAULT 5,
  supplier TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view parts" ON public.parts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert parts" ON public.parts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update parts" ON public.parts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete parts" ON public.parts FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parts_set_updated_at
BEFORE UPDATE ON public.parts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.parts;
ALTER TABLE public.parts REPLICA IDENTITY FULL;
