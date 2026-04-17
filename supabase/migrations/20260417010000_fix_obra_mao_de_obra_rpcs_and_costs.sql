alter table public.obra_lancamentos_mao_de_obra
  add column if not exists subconta text
  check (subconta in ('CAIXA', 'APLICADO'));

alter table public.obra_lancamentos_mao_de_obra
  add column if not exists financeiro_movimentacao_id uuid
  references public.financeiro_movimentacoes(id) on delete set null;

create index if not exists obra_lancamentos_mao_de_obra_fin_mov_idx
  on public.obra_lancamentos_mao_de_obra (financeiro_movimentacao_id)
  where financeiro_movimentacao_id is not null;

drop policy if exists "authenticated_full_access_mao_de_obra"
  on public.obra_lancamentos_mao_de_obra;

create policy "mao_de_obra_select"
  on public.obra_lancamentos_mao_de_obra
  for select
  to authenticated
  using (public.auth_can_access_obra(obra_id));

create policy "mao_de_obra_write"
  on public.obra_lancamentos_mao_de_obra
  for all
  to authenticated
  using (public.auth_can_manage_estoque() and public.auth_can_access_obra(obra_id))
  with check (public.auth_can_manage_estoque() and public.auth_can_access_obra(obra_id));

create or replace function public.create_obra_lancamento_mao_de_obra(
  p_obra_id text,
  p_almoxarifado_id text default null,
  p_descricao text default null,
  p_valor numeric default null,
  p_data date default null,
  p_forma_pagamento text default null,
  p_conta_id uuid default null,
  p_subconta text default null,
  p_prestador text default null,
  p_observacao text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento_id uuid;
  v_financeiro_movimentacao_id uuid;
  v_data date := coalesce(p_data, current_date);
  v_descricao text := nullif(trim(coalesce(p_descricao, '')), '');
  v_prestador text := nullif(trim(coalesce(p_prestador, '')), '');
  v_subconta text := nullif(trim(coalesce(p_subconta, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Usuário autenticado não encontrado para registrar mão de obra';
  end if;

  if not public.auth_can_access_obra(p_obra_id) then
    raise exception 'Você não tem acesso a esta obra';
  end if;

  if not public.auth_can_manage_estoque() then
    raise exception 'Você não tem permissão para lançar mão de obra';
  end if;

  if v_descricao is null then
    raise exception 'Descrição da mão de obra é obrigatória';
  end if;

  if p_valor is null or p_valor <= 0 then
    raise exception 'Valor da mão de obra deve ser maior que zero';
  end if;

  if p_almoxarifado_id is not null then
    perform 1
    from public.almoxarifados a
    where a.id = p_almoxarifado_id
      and a.obra_id = p_obra_id;

    if not found then
      raise exception 'Local de construção inválido para esta obra';
    end if;
  end if;

  if p_conta_id is not null then
    if v_subconta not in ('CAIXA', 'APLICADO') then
      raise exception 'Selecione a subconta para debitar a mão de obra';
    end if;

    if nullif(trim(coalesce(p_forma_pagamento, '')), '') is null then
      raise exception 'Forma de pagamento é obrigatória ao debitar uma conta';
    end if;

    v_financeiro_movimentacao_id := public.register_financeiro_movement(
      p_conta_id,
      'SAIDA',
      v_subconta,
      format(
        'Mão de obra: %s%s',
        v_descricao,
        case when v_prestador is not null then ' - ' || v_prestador else '' end
      ),
      p_valor,
      v_data,
      case when v_subconta = 'CAIXA' then -p_valor else 0 end,
      case when v_subconta = 'APLICADO' then -p_valor else 0 end
    );
  end if;

  insert into public.obra_lancamentos_mao_de_obra (
    obra_id,
    almoxarifado_id,
    descricao,
    valor,
    data,
    forma_pagamento,
    conta_id,
    subconta,
    prestador,
    observacao,
    financeiro_movimentacao_id
  )
  values (
    p_obra_id,
    p_almoxarifado_id,
    v_descricao,
    p_valor,
    v_data,
    nullif(trim(coalesce(p_forma_pagamento, '')), ''),
    p_conta_id,
    v_subconta,
    v_prestador,
    nullif(trim(coalesce(p_observacao, '')), ''),
    v_financeiro_movimentacao_id
  )
  returning id into v_lancamento_id;

  return json_build_object('id', v_lancamento_id);
end;
$$;

grant execute on function public.create_obra_lancamento_mao_de_obra(
  text,
  text,
  text,
  numeric,
  date,
  text,
  uuid,
  text,
  text,
  text
) to authenticated;

create or replace function public.delete_obra_lancamento_mao_de_obra(
  p_id uuid,
  p_obra_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento public.obra_lancamentos_mao_de_obra%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuário autenticado não encontrado para excluir mão de obra';
  end if;

  if not public.auth_can_access_obra(p_obra_id) then
    raise exception 'Você não tem acesso a esta obra';
  end if;

  if not public.auth_can_manage_estoque() then
    raise exception 'Você não tem permissão para excluir mão de obra';
  end if;

  select *
  into v_lancamento
  from public.obra_lancamentos_mao_de_obra
  where id = p_id
    and obra_id = p_obra_id
  for update;

  if not found then
    raise exception 'O lançamento não pôde ser excluído. Verifique suas permissões.';
  end if;

  if v_lancamento.financeiro_movimentacao_id is not null
     and v_lancamento.conta_id is not null
     and v_lancamento.subconta in ('CAIXA', 'APLICADO') then
    perform public.reverse_financeiro_movement(
      v_lancamento.financeiro_movimentacao_id,
      v_lancamento.conta_id,
      case when v_lancamento.subconta = 'CAIXA' then -v_lancamento.valor else 0 end,
      case when v_lancamento.subconta = 'APLICADO' then -v_lancamento.valor else 0 end
    );
  end if;

  delete from public.obra_lancamentos_mao_de_obra
  where id = v_lancamento.id;

  return json_build_object('id', v_lancamento.id);
end;
$$;

grant execute on function public.delete_obra_lancamento_mao_de_obra(uuid, text)
  to authenticated;

create or replace function public.get_obra_custos(p_obra_id uuid)
returns json
language plpgsql
as $function$
declare
    v_orcamento        numeric;
    v_valor_terreno    numeric;
    v_valor_burocracia numeric;
    v_valor_construcao numeric;
    v_valor_mao_de_obra numeric;
    v_valor_venda      numeric;
    v_total            numeric;
    v_saldo            numeric;
    v_percentual       numeric;
    v_por_categoria    json;
    v_tendencia        json;
begin
    select o.orcamento, o.valor_terreno, o.valor_venda
    into v_orcamento, v_valor_terreno, v_valor_venda
    from public.obras o where o.id = p_obra_id;

    select coalesce(sum(lb.valor), 0)
    into v_valor_burocracia
    from public.obra_lancamentos_burocracia lb
    where lb.obra_id = p_obra_id;

    select coalesce(sum(mdo.valor), 0)
    into v_valor_mao_de_obra
    from public.obra_lancamentos_mao_de_obra mdo
    where mdo.obra_id = p_obra_id::text;

    select coalesce(sum(mov.quantidade * coalesce(mov.preco_unitario, 0)), 0)
    into v_valor_construcao
    from public.movimentacoes mov
    join public.almoxarifados a on a.id = mov.almoxarifado_id
    where a.obra_id = p_obra_id
      and mov.tipo = 'ENTRADA';

    v_valor_construcao := coalesce(v_valor_construcao, 0) + coalesce(v_valor_mao_de_obra, 0);
    v_total := coalesce(v_valor_terreno, 0) + v_valor_burocracia + v_valor_construcao;
    v_saldo := coalesce(v_orcamento, 0) - v_total;
    v_percentual := case when coalesce(v_orcamento, 0) > 0
                        then round(v_total / v_orcamento * 100)
                        else 0
                    end;

    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    into v_por_categoria
    from (
        select c.nome as categoria, sum(e.quantidade * m.preco_unitario) as valor
        from public.estoques e
        join public.materiais m on m.id = e.material_id
        join public.categorias c on c.id = m.categoria_id
        join public.almoxarifados a on a.id = e.almoxarifado_id
        where a.obra_id = p_obra_id
        group by c.nome
        order by valor desc
    ) t;

    select coalesce(
        json_agg(
            json_build_object('mes', mes, 'valor', valor)
            order by mes_date
        ),
        '[]'::json
    )
    into v_tendencia
    from (
        select
            mes_date,
            to_char(mes_date, 'Mon/YY') as mes,
            sum(valor) as valor
        from (
            select
                date_trunc('month', mov.created_at) as mes_date,
                mov.quantidade * coalesce(mov.preco_unitario, 0) as valor
            from public.movimentacoes mov
            join public.almoxarifados a on a.id = mov.almoxarifado_id
            where a.obra_id = p_obra_id
              and mov.tipo = 'ENTRADA'

            union all

            select
                date_trunc('month', lb.data::timestamptz) as mes_date,
                lb.valor as valor
            from public.obra_lancamentos_burocracia lb
            where lb.obra_id = p_obra_id

            union all

            select
                date_trunc('month', mdo.data::timestamptz) as mes_date,
                mdo.valor as valor
            from public.obra_lancamentos_mao_de_obra mdo
            where mdo.obra_id = p_obra_id::text
        ) raw
        group by mes_date
        order by mes_date
    ) agg;

    return json_build_object(
        'orcamento',       v_orcamento,
        'total',           v_total,
        'saldo',           v_saldo,
        'percentual',      v_percentual,
        'valorTerreno',    v_valor_terreno,
        'valorBurocracia', v_valor_burocracia,
        'valorConstrucao', v_valor_construcao,
        'valorVenda',      v_valor_venda,
        'porCategoria',    v_por_categoria,
        'tendencia',       v_tendencia
    );
end;
$function$;

create or replace function public.get_custo_por_obra()
returns table(
  id uuid,
  obra text,
  endereco text,
  status text,
  custo numeric,
  orcamento numeric,
  valor_terreno numeric,
  valor_burocracia numeric,
  valor_construcao numeric,
  valor_venda numeric,
  percentual numeric
)
language plpgsql
as $function$
begin
  return query
  with obra_totais as (
    select
      o.id,
      o.nome::text as obra,
      o.endereco::text as endereco,
      o.status::text as status,
      o.orcamento::numeric as orcamento,
      o.valor_terreno::numeric as valor_terreno,
      o.valor_venda::numeric as valor_venda,
      coalesce((
        select sum(lb.valor)
        from public.obra_lancamentos_burocracia lb
        where lb.obra_id = o.id
      ), 0)::numeric as valor_burocracia,
      (
        coalesce((
          select sum(mov.quantidade * coalesce(mov.preco_unitario, 0))
          from public.movimentacoes mov
          join public.almoxarifados a on a.id = mov.almoxarifado_id
          where a.obra_id = o.id
            and mov.tipo = 'ENTRADA'
        ), 0)
        + coalesce((
          select sum(mdo.valor)
          from public.obra_lancamentos_mao_de_obra mdo
          where mdo.obra_id = o.id::text
        ), 0)
      )::numeric as valor_construcao
    from public.obras o
  )
  select
    ot.id,
    ot.obra,
    ot.endereco,
    ot.status,
    (coalesce(ot.valor_terreno, 0) + coalesce(ot.valor_burocracia, 0) + coalesce(ot.valor_construcao, 0))::numeric as custo,
    ot.orcamento,
    ot.valor_terreno,
    ot.valor_burocracia,
    ot.valor_construcao,
    ot.valor_venda,
    case when coalesce(ot.orcamento, 0) > 0
      then round(
        (
          coalesce(ot.valor_terreno, 0)
          + coalesce(ot.valor_burocracia, 0)
          + coalesce(ot.valor_construcao, 0)
        ) / ot.orcamento * 100
      )::numeric
      else 0::numeric
    end as percentual
  from obra_totais ot;
end;
$function$;

create or replace function public.get_dashboard_stats()
 returns json
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
        + coalesce((
            select sum(mdo.valor)
            from public.obra_lancamentos_mao_de_obra mdo
            where mdo.obra_id = o.id::text
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
