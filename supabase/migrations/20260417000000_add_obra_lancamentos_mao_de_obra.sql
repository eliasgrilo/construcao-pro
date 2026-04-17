create table if not exists obra_lancamentos_mao_de_obra (
  id uuid primary key default gen_random_uuid(),
  obra_id text not null references obras(id) on delete cascade,
  almoxarifado_id text references almoxarifados(id) on delete set null,
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  data date not null default current_date,
  forma_pagamento text,
  conta_id uuid references financeiro_contas(id) on delete set null,
  prestador text,
  observacao text,
  created_at timestamptz not null default now()
);

alter table obra_lancamentos_mao_de_obra enable row level security;

create policy "authenticated_full_access_mao_de_obra"
  on obra_lancamentos_mao_de_obra
  for all
  to authenticated
  using (true)
  with check (true);

create index obra_lancamentos_mao_de_obra_obra_id_idx
  on obra_lancamentos_mao_de_obra (obra_id);

create index obra_lancamentos_mao_de_obra_data_idx
  on obra_lancamentos_mao_de_obra (data desc);
