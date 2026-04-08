-- Tabela de tarefas do checklist (obra_id é text para compatibilidade com obras.id)
create table if not exists tarefas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  texto       text not null,
  obra_id     text,
  obra_nome   text,
  concluida   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS: cada usuário só vê/modifica suas próprias tarefas
alter table tarefas enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'tarefas' and policyname = 'users can manage own tarefas'
  ) then
    execute 'create policy "users can manage own tarefas" on tarefas for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;

-- Índices para performance
create index if not exists tarefas_user_id_idx on tarefas(user_id);
create index if not exists tarefas_obra_id_idx on tarefas(obra_id);

-- Trigger updated_at
create or replace function update_tarefas_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tarefas_updated_at on tarefas;
create trigger tarefas_updated_at
  before update on tarefas
  for each row execute function update_tarefas_updated_at();
