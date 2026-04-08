-- ─────────────────────────────────────────────────────────────
-- Fix get_dashboard_stats: custoTotal must include valor_terreno
-- + valor_burocracia (from obra_lancamentos_burocracia) +
-- valor_construcao (movimentacoes ENTRADA), consistent with
-- get_custo_por_obra and the obra card breakdown.
-- Previously it only summed movimentacoes, missing terreno and
-- burocracia entirely.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_result json;
begin
  select public.is_admin() into v_is_admin;

  select json_build_object(
    'obrasAtivas', (
      select count(*) from public.obras o
      where o.status = 'ATIVA'
      and (v_is_admin or exists(select 1 from public.usuario_obras uo where uo.usuario_id = v_user_id and uo.obra_id = o.id))
    ),
    'totalObras', (
      select count(*) from public.obras o
      where v_is_admin or exists(select 1 from public.usuario_obras uo where uo.usuario_id = v_user_id and uo.obra_id = o.id)
    ),
    'totalMateriais', (select count(*) from public.materiais),
    'totalMovimentacoes', (
      select count(*) from public.movimentacoes m
      where v_is_admin or exists(
        select 1 from public.almoxarifados a
        join public.usuario_obras uo on uo.obra_id = a.obra_id
        where a.id = m.almoxarifado_id and uo.usuario_id = v_user_id
      )
    ),
    'totalNFs', (select count(*) from public.notas_fiscais),
    'alertasEstoque', (
      select count(*) from public.estoques e
      join public.materiais mat on mat.id = e.material_id
      where e.quantidade <= mat.estoque_minimo
      and (v_is_admin or exists(
        select 1 from public.almoxarifados a
        join public.usuario_obras uo on uo.obra_id = a.obra_id
        where a.id = e.almoxarifado_id and uo.usuario_id = v_user_id
      ))
    ),
    -- custoTotal = terreno + burocracia + construção (same breakdown as obra cards)
    'custoTotal', coalesce((
      select sum(
        coalesce(o.valor_terreno, 0)
        + coalesce((
            select sum(lb.valor)
            from public.obra_lancamentos_burocracia lb
            where lb.obra_id = o.id
          ), 0)
        + coalesce((
            select sum(mov.quantidade * coalesce(mov.preco_unitario, 0))
            from public.movimentacoes mov
            join public.almoxarifados a on a.id = mov.almoxarifado_id
            where a.obra_id = o.id and mov.tipo = 'ENTRADA'
          ), 0)
      )
      from public.obras o
      where (v_is_admin or exists(
        select 1 from public.usuario_obras uo
        where uo.usuario_id = v_user_id and uo.obra_id = o.id
      ))
    ), 0),
    'orcamentoTotal', coalesce((
      select sum(o.orcamento) from public.obras o
      where v_is_admin or exists(select 1 from public.usuario_obras uo where uo.usuario_id = v_user_id and uo.obra_id = o.id)
    ), 0)
  ) into v_result;

  return v_result;
end;
$function$;
