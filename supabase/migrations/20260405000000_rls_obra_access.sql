-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: Role-aware access control for core tables
--
-- Problem: all tables had a single "allow_all_authenticated" policy, meaning
-- any authenticated user could read/write any row. A VISUALIZADOR/ALMOXARIFE
-- with access to only two obras could still read data from every other obra
-- if they knew the IDs.
--
-- Strategy:
--   • ADMIN / GESTOR → unrestricted access (same as before)
--   • ALMOXARIFE / VISUALIZADOR → limited to obras listed in usuario_obras
--   • Write operations (INSERT/UPDATE/DELETE) require GESTOR or higher
--
-- Tables covered: obras, almoxarifados, estoques, movimentacoes,
--                 obra_lancamentos_burocracia, obra_manutencao
--
-- Tables left on allow_all (not obra-scoped): materiais, categorias,
--   fornecedores, notas_fiscais, financeiro_*, documentos, usuarios, tarefas
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper function ──────────────────────────────────────────────────────────
-- Returns TRUE when the calling user is ADMIN or GESTOR (unrestricted access).
CREATE OR REPLACE FUNCTION auth_is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()::text
      AND role IN ('ADMIN', 'GESTOR')
  )
$$;

-- Returns TRUE when the calling user has any assignment to the given obra.
CREATE OR REPLACE FUNCTION auth_can_access_obra(p_obra_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth_is_manager()
      OR EXISTS (
           SELECT 1 FROM usuario_obras
           WHERE usuario_id = auth.uid()::text
             AND obra_id = p_obra_id
         )
$$;

-- Returns TRUE when the calling user can manage estoque/movimentacoes
-- (ADMIN, GESTOR, or ALMOXARIFE — excludes VISUALIZADOR).
CREATE OR REPLACE FUNCTION auth_can_manage_estoque()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()::text
      AND role IN ('ADMIN', 'GESTOR', 'ALMOXARIFE')
  )
$$;

GRANT EXECUTE ON FUNCTION auth_is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION auth_can_access_obra(text) TO authenticated;
GRANT EXECUTE ON FUNCTION auth_can_manage_estoque() TO authenticated;

-- ── obras ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_authenticated" ON obras;

CREATE POLICY "obras_select" ON obras
  FOR SELECT TO authenticated
  USING (auth_can_access_obra(id::text));

CREATE POLICY "obras_insert" ON obras
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_manager());

CREATE POLICY "obras_update" ON obras
  FOR UPDATE TO authenticated
  USING (auth_is_manager())
  WITH CHECK (auth_is_manager());

CREATE POLICY "obras_delete" ON obras
  FOR DELETE TO authenticated
  USING (auth_is_manager());

-- ── almoxarifados ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_authenticated" ON almoxarifados;

CREATE POLICY "almoxarifados_select" ON almoxarifados
  FOR SELECT TO authenticated
  USING (obra_id IS NULL OR auth_can_access_obra(obra_id));

CREATE POLICY "almoxarifados_write" ON almoxarifados
  FOR ALL TO authenticated
  USING (auth_is_manager())
  WITH CHECK (auth_is_manager());

-- ── estoques ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_authenticated" ON estoques;

CREATE POLICY "estoques_select" ON estoques
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM almoxarifados a
      WHERE a.id = estoques.almoxarifado_id
        AND (a.obra_id IS NULL OR auth_can_access_obra(a.obra_id))
    )
  );

-- ALMOXARIFE can manage estoque on obras they are assigned to
CREATE POLICY "estoques_write" ON estoques
  FOR ALL TO authenticated
  USING (
    auth_can_manage_estoque()
    AND EXISTS (
      SELECT 1 FROM almoxarifados a
      WHERE a.id = estoques.almoxarifado_id
        AND (a.obra_id IS NULL OR auth_can_access_obra(a.obra_id))
    )
  )
  WITH CHECK (
    auth_can_manage_estoque()
    AND EXISTS (
      SELECT 1 FROM almoxarifados a
      WHERE a.id = estoques.almoxarifado_id
        AND (a.obra_id IS NULL OR auth_can_access_obra(a.obra_id))
    )
  );

-- ── movimentacoes ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_authenticated" ON movimentacoes;

CREATE POLICY "movimentacoes_select" ON movimentacoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM almoxarifados a
      WHERE a.id = movimentacoes.almoxarifado_id
        AND (a.obra_id IS NULL OR auth_can_access_obra(a.obra_id))
    )
  );

-- ALMOXARIFE can create/manage movimentacoes on obras they are assigned to
CREATE POLICY "movimentacoes_write" ON movimentacoes
  FOR ALL TO authenticated
  USING (
    auth_can_manage_estoque()
    AND EXISTS (
      SELECT 1 FROM almoxarifados a
      WHERE a.id = movimentacoes.almoxarifado_id
        AND (a.obra_id IS NULL OR auth_can_access_obra(a.obra_id))
    )
  )
  WITH CHECK (
    auth_can_manage_estoque()
    AND EXISTS (
      SELECT 1 FROM almoxarifados a
      WHERE a.id = movimentacoes.almoxarifado_id
        AND (a.obra_id IS NULL OR auth_can_access_obra(a.obra_id))
    )
  );

-- ── obra_lancamentos_burocracia ───────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_authenticated" ON obra_lancamentos_burocracia;

CREATE POLICY "burocracia_select" ON obra_lancamentos_burocracia
  FOR SELECT TO authenticated
  USING (auth_can_access_obra(obra_id));

CREATE POLICY "burocracia_write" ON obra_lancamentos_burocracia
  FOR ALL TO authenticated
  USING (auth_is_manager())
  WITH CHECK (auth_is_manager());

-- ── obra_manutencao ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_authenticated" ON obra_manutencao;

CREATE POLICY "manutencao_select" ON obra_manutencao
  FOR SELECT TO authenticated
  USING (auth_can_access_obra(obra_id));

CREATE POLICY "manutencao_write" ON obra_manutencao
  FOR ALL TO authenticated
  USING (auth_is_manager())
  WITH CHECK (auth_is_manager());

-- ── Performance indexes required by the RLS subqueries above ─────────────────
-- Without these, every SELECT on movimentacoes/estoques does an O(N) scan on
-- almoxarifados (to resolve obra_id) and on usuario_obras (to check access).

-- almoxarifados.obra_id: used in every RLS EXISTS subquery for estoque/movimentacoes
CREATE INDEX IF NOT EXISTS idx_almoxarifados_obra_id
  ON almoxarifados(obra_id);

-- usuario_obras composite: used in auth_can_access_obra EXISTS check
CREATE INDEX IF NOT EXISTS idx_usuario_obras_usuario_obra
  ON usuario_obras(usuario_id, obra_id);

-- movimentacoes.almoxarifado_id: the JOIN key in RLS + obra detail queries
CREATE INDEX IF NOT EXISTS idx_movimentacoes_almoxarifado_id
  ON movimentacoes(almoxarifado_id);

-- movimentacoes.material_id: used in obra cost queries and material detail page
CREATE INDEX IF NOT EXISTS idx_movimentacoes_material_id
  ON movimentacoes(material_id);

-- movimentacoes.fornecedor_id: used in fornecedor detail page
CREATE INDEX IF NOT EXISTS idx_movimentacoes_fornecedor_id
  ON movimentacoes(fornecedor_id)
  WHERE fornecedor_id IS NOT NULL;

-- movimentacoes.created_at: used for ordering in all list queries
CREATE INDEX IF NOT EXISTS idx_movimentacoes_created_at
  ON movimentacoes(created_at DESC);

-- estoques.almoxarifado_id: used in RLS EXISTS and obra detail estoque queries
CREATE INDEX IF NOT EXISTS idx_estoques_almoxarifado_id
  ON estoques(almoxarifado_id);

-- estoques.material_id: used in material detail and min-stock queries
CREATE INDEX IF NOT EXISTS idx_estoques_material_id
  ON estoques(material_id);
