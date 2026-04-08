-- ─────────────────────────────────────────────────────────────
-- Link contas_pagar to NF-e + mark overdue parcelas as ATRASADO
-- ─────────────────────────────────────────────────────────────

-- Add nf_id link: ON DELETE RESTRICT prevents deleting NF with open accounts
ALTER TABLE contas_pagar
  ADD COLUMN IF NOT EXISTS nf_id UUID REFERENCES notas_fiscais(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contas_pagar_nf_id ON contas_pagar(nf_id);

-- RPC: mark overdue parcelas as ATRASADO (called by pg_cron daily)
CREATE OR REPLACE FUNCTION mark_parcelas_atrasado()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE contas_pagar_parcelas
    SET status = 'ATRASADO'
  WHERE status = 'PENDENTE'
    AND vencimento < CURRENT_DATE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_parcelas_atrasado() TO authenticated;
