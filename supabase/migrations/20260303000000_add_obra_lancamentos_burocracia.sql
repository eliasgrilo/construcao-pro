-- ─────────────────────────────────────────────────────────────
-- Obra Lançamentos Burocracia
-- Tabela para registrar lançamentos financeiros de burocracia
-- por obra: banco, vendas, impostos e taxas.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS obra_lancamentos_burocracia (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id     UUID        NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  categoria   TEXT        NOT NULL CHECK (categoria IN ('banco', 'vendas', 'impostos', 'taxas')),
  descricao   TEXT        NOT NULL,
  valor       NUMERIC(15,2) NOT NULL CHECK (valor >= 0),
  data        DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS obra_lancamentos_burocracia_obra_id_idx
  ON obra_lancamentos_burocracia (obra_id);

CREATE INDEX IF NOT EXISTS obra_lancamentos_burocracia_obra_data_idx
  ON obra_lancamentos_burocracia (obra_id, data DESC);

-- RLS — mesma política permissiva usada nas outras tabelas da aplicação
ALTER TABLE obra_lancamentos_burocracia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated"
  ON obra_lancamentos_burocracia
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
