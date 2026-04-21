
-- Enum des rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'collecteur', 'client');

-- Enum méthodes de paiement
CREATE TYPE public.payment_method AS ENUM ('cash', 'mobile_money_orange', 'mobile_money_mtn', 'mobile_money_wave', 'mobile_money_moov');

-- Enum statut transaction
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'cancelled');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (séparé pour la sécurité)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Clients (fiche métier liée au profile pour le rôle client)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  collector_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL DEFAULT 'cash',
  status transaction_status NOT NULL DEFAULT 'completed',
  notes TEXT,
  reference TEXT NOT NULL DEFAULT ('TX-' || upper(substr(md5(random()::text), 1, 8))),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications (WhatsApp simulé)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message TEXT NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'simulated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier les rôles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction utilitaire : récupérer le rôle principal d'un user
CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'collecteur' THEN 2 WHEN 'client' THEN 3 END
  LIMIT 1
$$;

-- Trigger auto-create profile à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fonction transactionnelle : créer une transaction + maj solde + notification
CREATE OR REPLACE FUNCTION public.record_transaction(
  _client_id UUID,
  _amount NUMERIC,
  _method payment_method,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tx_id UUID;
  _client_record RECORD;
  _collector_name TEXT;
BEGIN
  -- Vérification du rôle collecteur ou admin
  IF NOT (public.has_role(auth.uid(), 'collecteur') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Accès refusé : rôle collecteur ou admin requis';
  END IF;

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être positif';
  END IF;

  SELECT c.*, p.phone AS client_phone INTO _client_record
  FROM public.clients c
  JOIN public.profiles p ON p.id = c.profile_id
  WHERE c.id = _client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client introuvable';
  END IF;

  SELECT full_name INTO _collector_name FROM public.profiles WHERE id = auth.uid();

  -- Insertion transaction
  INSERT INTO public.transactions (client_id, collector_id, amount, method, notes)
  VALUES (_client_id, auth.uid(), _amount, _method, _notes)
  RETURNING id INTO _tx_id;

  -- Mise à jour solde
  UPDATE public.clients SET balance = balance + _amount WHERE id = _client_id;

  -- Notification simulée pour le client
  INSERT INTO public.notifications (recipient_user_id, recipient_phone, message, transaction_id)
  VALUES (
    _client_record.profile_id,
    _client_record.client_phone,
    format('Gadzola : Paiement de %s FCFA reçu par %s. Réf: %s', _amount, COALESCE(_collector_name, 'collecteur'), (SELECT reference FROM public.transactions WHERE id = _tx_id)),
    _tx_id
  );

  RETURN _tx_id;
END;
$$;

-- Fonction admin : créer un user (collecteur ou client)
-- Note : la création du compte auth se fait via edge function ; ici on assigne le rôle après-coup.
CREATE OR REPLACE FUNCTION public.assign_role(_user_id UUID, _role app_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seul un admin peut attribuer un rôle';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- ===== POLICIES =====

-- profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors can view client profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'collecteur') AND public.has_role(id, 'client')
  );
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- clients
CREATE POLICY "Admins manage all clients" ON public.clients
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors view all clients" ON public.clients
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'collecteur'));
CREATE POLICY "Clients view their own client record" ON public.clients
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- transactions
CREATE POLICY "Admins view all transactions" ON public.transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Collectors view their transactions" ON public.transactions
  FOR SELECT TO authenticated USING (collector_id = auth.uid());
CREATE POLICY "Clients view their transactions" ON public.transactions
  FOR SELECT TO authenticated USING (
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid())
  );
-- Insertion transactions : uniquement via fonction record_transaction (security definer)
-- mais on autorise aussi insert direct par admin/collecteur pour flexibilité
CREATE POLICY "Collectors and admins insert transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (
    collector_id = auth.uid() AND
    (public.has_role(auth.uid(), 'collecteur') OR public.has_role(auth.uid(), 'admin'))
  );

-- notifications
CREATE POLICY "Recipients view their notifications" ON public.notifications
  FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());
CREATE POLICY "Admins view all notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
