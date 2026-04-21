-- Add suspension flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Add index for performance in admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended);

-- Update RLS if needed (assuming profiles are readable/writable by admin)
-- (The Edge Function uses service_role, so it bypasses RLS)
