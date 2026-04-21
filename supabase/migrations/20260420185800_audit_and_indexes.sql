-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance on critical search fields
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON public.clients USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);

-- Function to help with audit logging (optional but useful)
CREATE OR REPLACE FUNCTION public.log_action(
    _action TEXT,
    _entity_type TEXT,
    _entity_id UUID DEFAULT NULL,
    _old_data JSONB DEFAULT NULL,
    _new_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (auth.uid(), _action, _entity_type, _entity_id, _old_data, _new_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We need pg_trgm extension for the gin index if not already present
CREATE EXTENSION IF NOT EXISTS pg_trgm;
