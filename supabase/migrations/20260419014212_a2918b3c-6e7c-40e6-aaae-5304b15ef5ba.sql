-- Table des objectifs mensuels d'épargne client
CREATE TABLE public.client_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, year, month)
);

ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;

-- Clients gèrent leurs objectifs
CREATE POLICY "Clients view their own goals"
ON public.client_goals FOR SELECT TO authenticated
USING (client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()));

CREATE POLICY "Clients insert their own goals"
ON public.client_goals FOR INSERT TO authenticated
WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()));

CREATE POLICY "Clients update their own goals"
ON public.client_goals FOR UPDATE TO authenticated
USING (client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()));

CREATE POLICY "Clients delete their own goals"
ON public.client_goals FOR DELETE TO authenticated
USING (client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid()));

-- Admins voient tout
CREATE POLICY "Admins manage all goals"
ON public.client_goals FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Collecteurs voient les objectifs
CREATE POLICY "Collectors view all goals"
ON public.client_goals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'collecteur'));

-- Trigger updated_at
CREATE TRIGGER update_client_goals_updated_at
BEFORE UPDATE ON public.client_goals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index utile
CREATE INDEX idx_client_goals_client_period ON public.client_goals(client_id, year, month);