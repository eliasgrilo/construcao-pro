-- ─────────────────────────────────────────────────────────────
-- Contas a Receber — tabela-pai + parcelas (espelha contas_pagar)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contas_receber (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao   TEXT        NOT NULL,
  cliente     TEXT,
  obra_id     UUID        REFERENCES obras(id) ON DELETE SET NULL,
  observacoes TEXT,
  valor_total NUMERIC     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON contas_receber
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS contas_receber_parcelas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_receber_id  UUID        NOT NULL REFERENCES contas_receber(id) ON DELETE CASCADE,
  numero_parcela    INTEGER     NOT NULL DEFAULT 1,
  total_parcelas    INTEGER     NOT NULL DEFAULT 1,
  valor             NUMERIC     NOT NULL DEFAULT 0,
  vencimento        DATE        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'PENDENTE'
                    CHECK (status IN ('PENDENTE','RECEBIDO','ATRASADO')),
  recebido_em       DATE,
  conta_bancaria_id UUID        REFERENCES financeiro_contas(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contas_receber_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON contas_receber_parcelas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for fast status + date queries
CREATE INDEX IF NOT EXISTS idx_crp_status     ON contas_receber_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_crp_vencimento ON contas_receber_parcelas(vencimento);
CREATE INDEX IF NOT EXISTS idx_crp_conta      ON contas_receber_parcelas(conta_receber_id);
