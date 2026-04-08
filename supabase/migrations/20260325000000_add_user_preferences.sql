-- ─────────────────────────────────────────────────────────────
-- User Preferences — add per-user isolation (user_id column)
-- Fixes theme sync and taxa_cartao not persisting across devices
-- ─────────────────────────────────────────────────────────────

-- Remove stale data (no user_id meant shared between all users)
DELETE FROM user_preferences;

-- Add user_id column with default auth.uid()
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();

-- Drop old unique constraint (chave only) and add per-user unique
ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_chave_key;
ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_user_chave_key UNIQUE (user_id, chave);

-- Drop old RLS policies and create a single per-user policy
DROP POLICY IF EXISTS user_preferences_insert ON user_preferences;
DROP POLICY IF EXISTS user_preferences_select ON user_preferences;
DROP POLICY IF EXISTS user_preferences_update ON user_preferences;

CREATE POLICY "users_own_preferences" ON user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_user_preferences_timestamp();
