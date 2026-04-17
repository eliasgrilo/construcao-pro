-- contas_pagar_parcelas had a set_updated_at trigger but no updated_at column,
-- causing the pagar_parcela RPC to fail on UPDATE.
ALTER TABLE contas_pagar_parcelas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
