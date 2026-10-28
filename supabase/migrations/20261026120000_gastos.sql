-- =============================================================================
-- Old Brownies — gastos do dono (aba Caixa / fluxo de caixa) · 2026-10-26
--
-- Roda DEPOIS de 20261016120000_seguranca_rls.sql: usa as funções dela (set_updated_at,
-- impedir_troca_de_empresa, empresas_com_papel). Idempotente e numa transação.
--
-- Quem faz o quê: dono lê e lança; mentor só lê; equipe e parceiro não veem. Ninguém apaga de
-- verdade (exclusão lógica por deleted_at, como em todo o app).
-- Não mexe em vendas, estoque nem no resultado do mês: é uma tabela nova, só de saídas de caixa.
-- =============================================================================

begin;

do $$
begin
  if to_regprocedure('public.empresas_com_papel(text[])') is null then
    raise exception 'Rode antes a migração 20261016120000_seguranca_rls.sql.';
  end if;
end;
$$;

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  valor numeric not null check (valor >= 0),
  categoria text not null,
  descricao text not null default '',
  pagamento text not null default 'outro',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

drop trigger if exists trg_gastos_updated_at on public.gastos;
create trigger trg_gastos_updated_at before insert or update on public.gastos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_gastos_empresa_fixa on public.gastos;
create trigger trg_gastos_empresa_fixa before update on public.gastos
  for each row execute function public.impedir_troca_de_empresa();

create index if not exists idx_gastos_empresa_updated on public.gastos (empresa_id, updated_at);

alter table public.gastos enable row level security;

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'gastos' loop
    execute format('drop policy %I on public.gastos', p.policyname);
  end loop;
end;
$$;

create policy gastos_select on public.gastos for select to authenticated
  using (empresa_id in (select public.empresas_com_papel('{dono,mentor}')));

create policy gastos_insert on public.gastos for insert to authenticated
  with check (empresa_id in (select public.empresas_com_papel('{dono}')));

create policy gastos_update on public.gastos for update to authenticated
  using (empresa_id in (select public.empresas_com_papel('{dono}')))
  with check (empresa_id in (select public.empresas_com_papel('{dono}')));

revoke all on public.gastos from public, anon, authenticated;
grant select, insert, update on public.gastos to authenticated;

commit;
