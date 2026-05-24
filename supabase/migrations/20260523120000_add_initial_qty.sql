BEGIN;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS initial_qty INTEGER DEFAULT 0;
UPDATE public.parts SET initial_qty = qty WHERE initial_qty IS NULL OR initial_qty = 0;
ALTER TABLE public.parts ALTER COLUMN initial_qty SET NOT NULL;
COMMIT;
