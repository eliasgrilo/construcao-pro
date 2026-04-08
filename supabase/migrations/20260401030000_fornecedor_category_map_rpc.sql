-- ─────────────────────────────────────────────────────────────────────────────
-- get_fornecedor_category_map — efficient DISTINCT supplier→category mapping
--
-- Problem: the previous query fetched ALL movimentacoes rows with a fornecedor_id
-- (potentially thousands) and processed them client-side. For large datasets this
-- means megabytes of data just to build a filter dropdown.
--
-- Solution: a server-side DISTINCT query that returns only unique
-- (fornecedor_id, categoria_id, categoria_nome) tuples — typically <100 rows.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_fornecedor_category_map()
RETURNS TABLE (
  fornecedor_id UUID,
  categoria_id  UUID,
  categoria_nome TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT
    m.fornecedor_id,
    c.id   AS categoria_id,
    c.nome AS categoria_nome
  FROM movimentacoes m
  JOIN materiais     mat ON mat.id = m.material_id
  JOIN categorias    c   ON c.id  = mat.categoria_id
  WHERE m.fornecedor_id IS NOT NULL
    AND m.tipo = 'ENTRADA';
$$;

GRANT EXECUTE ON FUNCTION get_fornecedor_category_map() TO authenticated;
