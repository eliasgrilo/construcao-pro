-- ─────────────────────────────────────────────────────────────
-- Fix: reschedule mark_parcelas_atrasado to 05:00 UTC (= 02:00 BRT)
-- Previous schedule was 02:00 UTC (= 23:00 BRT on the PREVIOUS day),
-- which could mark parcelas due TODAY as ATRASADO before midnight BRT.
-- New schedule runs safely after midnight in Brazil.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('mark-parcelas-atrasado');
    PERFORM cron.schedule(
      'mark-parcelas-atrasado',
      '0 5 * * *',
      $$SELECT mark_parcelas_atrasado()$$
    );
  END IF;
END;
$$;
