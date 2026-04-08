-- ============================================================
-- Módulo de Manutenção de Obras
-- Registra sessões de manutenção e seus problemas/itens
-- ============================================================

-- 1. Adicionar status MANUTENCAO ao enum existente
ALTER TYPE status_obra ADD VALUE IF NOT EXISTS 'MANUTENCAO';

-- 2. Tabela de sessões de manutenção (uma por obra por vez, mas histórico completo)
CREATE TABLE obra_manutencao (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id       UUID        NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido')),
  data_inicio   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_conclusao TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_obra_manutencao_obra_id ON obra_manutencao(obra_id);
CREATE INDEX idx_obra_manutencao_status  ON obra_manutencao(status);

-- 3. Tabela de itens/problemas de cada sessão de manutenção
CREATE TABLE obra_manutencao_item (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id  UUID        NOT NULL REFERENCES obra_manutencao(id) ON DELETE CASCADE,
  obra_id        UUID        NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  descricao      TEXT        NOT NULL,
  resolvido      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_obra_manutencao_item_manutencao_id ON obra_manutencao_item(manutencao_id);
CREATE INDEX idx_obra_manutencao_item_obra_id       ON obra_manutencao_item(obra_id);

-- 4. Triggers para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_obra_manutencao_updated_at
  BEFORE UPDATE ON obra_manutencao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_obra_manutencao_item_updated_at
  BEFORE UPDATE ON obra_manutencao_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS — acesso apenas para usuários autenticados
ALTER TABLE obra_manutencao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_manutencao_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users can manage obra_manutencao"
  ON obra_manutencao FOR ALL
  TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "auth users can manage obra_manutencao_item"
  ON obra_manutencao_item FOR ALL
  TO authenticated USING (TRUE) WITH CHECK (TRUE);
