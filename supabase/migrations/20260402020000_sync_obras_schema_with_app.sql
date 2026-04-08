-- ─────────────────────────────────────────────────────────────────────────────
-- Sync obras schema with the app contract
--
-- The frontend, analytics functions and newer atomic RPCs already depend on
-- these columns, but some environments still only have the legacy core fields.
-- This migration makes the table shape explicit and idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS orcamento NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_terreno NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_burocracia NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_construcao NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_venda NUMERIC,
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_previsao_termino DATE,
  ADD COLUMN IF NOT EXISTS responsavel TEXT,
  ADD COLUMN IF NOT EXISTS cliente TEXT,
  ADD COLUMN IF NOT EXISTS area_total NUMERIC,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;
