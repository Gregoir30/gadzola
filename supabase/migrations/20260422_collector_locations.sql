-- Suivi GPS des collecteurs
CREATE TABLE IF NOT EXISTS public.collector_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'browser',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collector_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collectors can insert their own locations"
ON public.collector_locations
FOR INSERT TO authenticated
WITH CHECK (collector_id = auth.uid() AND public.has_role(auth.uid(), 'collecteur'));

CREATE POLICY "Collectors can view their own locations"
ON public.collector_locations
FOR SELECT TO authenticated
USING (collector_id = auth.uid() AND public.has_role(auth.uid(), 'collecteur'));

CREATE POLICY "Admins can view all collector locations"
ON public.collector_locations
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_collector_locations_collector_time
ON public.collector_locations (collector_id, recorded_at DESC);
