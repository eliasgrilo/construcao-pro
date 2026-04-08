-- ─────────────────────────────────────────────────────────────
-- Fix get_custo_por_obra: sum valor_burocracia from
-- obra_lancamentos_burocracia instead of the static
-- obras.valor_burocracia column, consistent with the
-- already-fixed get_obra_custos function.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_custo_por_obra()
RETURNS TABLE(
  id             uuid,
  obra           text,
  endereco       text,
  status         text,
  custo          numeric,
  orcamento      numeric,
  valor_terreno  numeric,
  valor_burocracia numeric,
  valor_construcao numeric,
  valor_venda    numeric,
  percentual     numeric
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.nome::text                                                   AS obra,
    o.endereco::text,
    o.status::text,
    coalesce(sum(e.quantidade * m.preco_unitario), 0)::numeric     AS custo,
    o.orcamento::numeric,
    o.valor_terreno::numeric,
    -- Sum from lancamentos table instead of the static column
    coalesce(
      (SELECT sum(lb.valor)
       FROM obra_lancamentos_burocracia lb
       WHERE lb.obra_id = o.id),
      0
    )::numeric                                                     AS valor_burocracia,
    coalesce(
      (SELECT sum(mov.quantidade * coalesce(mov.preco_unitario, 0))
       FROM movimentacoes mov
       JOIN almoxarifados a2 ON a2.id = mov.almoxarifado_id
       WHERE a2.obra_id = o.id AND mov.tipo = 'ENTRADA'),
      0
    )::numeric                                                     AS valor_construcao,
    o.valor_venda::numeric,
    CASE WHEN o.orcamento > 0
         THEN round(
           coalesce(sum(e.quantidade * m.preco_unitario), 0) / o.orcamento * 100
         )::numeric
         ELSE 0::numeric
    END                                                            AS percentual
  FROM obras o
  LEFT JOIN almoxarifados a  ON a.obra_id = o.id
  LEFT JOIN estoques       e ON e.almoxarifado_id = a.id
  LEFT JOIN materiais      m ON m.id = e.material_id
  GROUP BY o.id, o.nome, o.endereco, o.status, o.orcamento,
           o.valor_terreno, o.valor_venda;
END;
$function$;
