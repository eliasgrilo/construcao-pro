-- ─────────────────────────────────────────────────────────────
-- Financeiro Meta — tabela para meta financeira global do app
-- Substitui o localStorage 'financeiro_meta' que era local
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financeiro_meta (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  valor       NUMERIC     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Linha única: insere o registro inicial se a tabela estiver vazia
INSERT INTO financeiro_meta (valor)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM financeiro_meta);

-- RLS — mesma política permissiva das outras tabelas financeiro_*
ALTER TABLE financeiro_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated"
  ON financeiro_meta
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_financeiro_meta_updated_at ON financeiro_meta;
CREATE TRIGGER set_financeiro_meta_updated_at
  BEFORE UPDATE ON financeiro_meta
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
