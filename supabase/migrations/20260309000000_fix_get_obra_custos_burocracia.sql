-- ─────────────────────────────────────────────────────────────
-- Fix get_obra_custos: sum valorBurocracia from
-- obra_lancamentos_burocracia instead of the static
-- obras.valor_burocracia column.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_obra_custos(p_obra_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_orcamento        numeric;
    v_valor_terreno    numeric;
    v_valor_burocracia numeric;
    v_valor_construcao numeric;
    v_valor_venda      numeric;
    v_total            numeric;
    v_saldo            numeric;
    v_percentual       numeric;
    v_por_categoria    json;
BEGIN
    SELECT o.orcamento, o.valor_terreno, o.valor_venda
    INTO v_orcamento, v_valor_terreno, v_valor_venda
    FROM obras o WHERE o.id = p_obra_id;

    -- Sum all burocracia entries from the lancamentos table
    SELECT coalesce(sum(lb.valor), 0)
    INTO v_valor_burocracia
    FROM obra_lancamentos_burocracia lb
    WHERE lb.obra_id = p_obra_id;

    SELECT coalesce(sum(mov.quantidade * coalesce(mov.preco_unitario, 0)), 0)
    INTO v_valor_construcao
    FROM movimentacoes mov
    JOIN almoxarifados a ON a.id = mov.almoxarifado_id
    WHERE a.obra_id = p_obra_id AND mov.tipo = 'ENTRADA';

    v_total      := coalesce(v_valor_terreno, 0) + v_valor_burocracia + v_valor_construcao;
    v_saldo      := coalesce(v_orcamento, 0) - v_total;
    v_percentual := CASE WHEN coalesce(v_orcamento, 0) > 0
                        THEN round(v_total / v_orcamento * 100)
                        ELSE 0
                    END;

    SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
    INTO v_por_categoria
    FROM (
        SELECT c.nome AS categoria, sum(e.quantidade * m.preco_unitario) AS valor
        FROM estoques e
        JOIN materiais m ON m.id = e.material_id
        JOIN categorias c ON c.id = m.categoria_id
        JOIN almoxarifados a ON a.id = e.almoxarifado_id
        WHERE a.obra_id = p_obra_id
        GROUP BY c.nome
        ORDER BY valor DESC
    ) t;

    RETURN json_build_object(
        'orcamento',       v_orcamento,
        'total',           v_total,
        'saldo',           v_saldo,
        'percentual',      v_percentual,
        'valorTerreno',    v_valor_terreno,
        'valorBurocracia', v_valor_burocracia,
        'valorConstrucao', v_valor_construcao,
        'valorVenda',      v_valor_venda,
        'porCategoria',    v_por_categoria
    );
END;
$function$;
