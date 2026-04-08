-- ─────────────────────────────────────────────────────────────
-- Contas a Pagar — tabela-pai + parcelas
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contas_pagar (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao   TEXT        NOT NULL,
  categoria   TEXT        NOT NULL DEFAULT 'Outros',
  obra_id     UUID        REFERENCES obras(id) ON DELETE SET NULL,
  observacoes TEXT,
  valor_total NUMERIC     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON contas_pagar
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS contas_pagar_parcelas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_pagar_id    UUID        NOT NULL REFERENCES contas_pagar(id) ON DELETE CASCADE,
  numero_parcela    INTEGER     NOT NULL DEFAULT 1,
  total_parcelas    INTEGER     NOT NULL DEFAULT 1,
  valor             NUMERIC     NOT NULL DEFAULT 0,
  vencimento        DATE        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PAGO','ATRASADO')),
  pago_em           DATE,
  conta_bancaria_id UUID        REFERENCES financeiro_contas(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contas_pagar_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON contas_pagar_parcelas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
