-- ─────────────────────────────────────────────────────────────
-- Schedule daily mark_parcelas_atrasado via pg_cron
-- Requires pg_cron extension to be enabled in Supabase project
-- ─────────────────────────────────────────────────────────────

-- Enable pg_cron if available (Supabase Pro plans)
-- If not available, this will silently fail and the Edge Function can be used instead
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'mark-parcelas-atrasado',
      '0 2 * * *',
      $$SELECT mark_parcelas_atrasado()$$
    );
  END IF;
END;
$$;
