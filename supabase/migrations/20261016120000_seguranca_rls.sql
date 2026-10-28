-- =============================================================================
-- Old Brownies — segurança de RLS (v3) · 2026-10-16
--
-- Fecha:
--   1. membros_insert aberto: qualquer conta virava membro (até dono) de qualquer empresa.
--   2. empresas legíveis por qualquer conta (CNPJ, Pix, endereço e o id usado no ataque 1).
--   3. insert/update das tabelas operacionais sem checar empresa nem papel; troca de empresa_id.
--   4. falta de permissão por papel no servidor (B4 + v3 2.12).
--   5. notas_mentor, configs_mentor e custos_fixos com WITH CHECK aberto.
--   6. sequestro de empresa sem membros.
--   7. funções security definer sem search_path.
--   8. DELETE físico (a regra do app é exclusão lógica por deleted_at).
--   9. restos do período aberto: convites pendentes (porta de volta) e empresas.empresa_id adulterado.
--  10. vínculo duplicado (mesma pessoa duas vezes, ou dois donos) mesmo sem os índices únicos.
--
-- Regras do desenho:
--   * O app grava com upsert (INSERT ... ON CONFLICT (id) DO UPDATE). Para a mesma linha valem a
--     política de INSERT, a de UPDATE (USING na antiga, WITH CHECK na nova) e a de SELECT (antiga e
--     nova). Por isso o que cada papel grava é subconjunto do que ele lê.
--   * Uma linha recusada para a fila inteira do aparelho: toda escrita legítima de cada papel
--     (ESCRITA em src/lib/sync/gravar.ts) precisa passar.
--   * Nenhuma política de SELECT filtra deleted_at: a exclusão lógica precisa chegar aos aparelhos.
--   * Implantação: enquanto o criador (dono ou mentor) é a única pessoa que já passou pela empresa,
--     ele vale por todos os papéis e semeia tudo, inclusive a área do mentor. Acaba quando qualquer
--     outra pessoa entra por convite.
--   * Sem token (SQL Editor, service_role) os gatilhos de proteção não interferem: é o suporte.
--
-- Idempotente e numa transação. O bloco entre ">>> SEGURANÇA" e "<<< SEGURANÇA" é idêntico ao fim
-- de supabase/schema.sql. Depois de aplicar, rode supabase/verificacao_rls.sql.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. PRÉ-CHECAGEM: as tabelas da primeira versão do schema precisam existir.
-- -----------------------------------------------------------------------------
do $$
declare
  v_faltando text;
begin
  select string_agg(t, ', ') into v_faltando
  from unnest(array[
    'empresas', 'membros', 'convites', 'configs', 'insumos', 'compras', 'sabores', 'receita_itens',
    'tamanhos', 'produtos', 'producoes', 'producao_itens', 'lotes', 'movimentos', 'canais', 'vendas',
    'venda_itens', 'parceiros', 'visitas_ponto', 'perdas', 'amostras', 'contagens', 'custos_fixos',
    'rotina_tarefas', 'tarefas_avulsas', 'checklist_itens', 'recados_mentor', 'notas_mentor',
    'configs_mentor', 'promocoes', 'zonas'
  ]) as t
  where to_regclass('public.' || t) is null;

  if v_faltando is not null then
    raise exception 'Tabelas ausentes: %. Rode antes a parte de tabelas de supabase/schema.sql.', v_faltando;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. ALINHAMENTO DO SCHEMA COM O APP
-- O upsert manda todas as chaves do registro local: coluna que falta no servidor para a fila.
-- Contrato (src/lib/sync/nuvem.ts): coluna = paraSnake(campo). usaVT → usa_v_t, metaRS → meta_r_s.
-- -----------------------------------------------------------------------------

-- 1.1 Tabelas que entraram depois da primeira versão do schema (ou que só existem no app).
create table if not exists public.lista_compras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  insumo_id uuid not null,
  quantidade_necessaria numeric not null,
  concluido boolean not null default false,
  valor_pago numeric,
  comprado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  membro_id uuid not null,
  nome text not null,
  admissao text not null,
  fim_experiencia text not null,
  fase text not null check (fase in ('experiencia', 'nivel1', 'nivel2', 'nivel3')),
  fase_desde text not null,
  usa_v_t boolean default false,
  viagens_dia int default 2,
  dias_mes_v_t int default 26,
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

create table if not exists public.mudancas_fase (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  funcionario_id uuid not null,
  data text not null,
  de text not null,
  para text not null,
  motivo text not null check (motivo in ('fim_experiencia', 'antecipacao', 'criterio', 'outro')),
  registrado_por text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

create table if not exists public.metricas_ifood (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data_referencia text not null,
  nota numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

create table if not exists public.cancelamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  venda_id uuid,
  motivo text not null,
  culpa text not null check (culpa in ('loja', 'motoboy', 'app')),
  registrado_por text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- MetaSemana (v3 2.8): metaRS/superMetaRS chegam como meta_r_s/super_meta_r_s.
create table if not exists public.metas_semana (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  inicio text not null,
  meta_r_s numeric not null,
  super_meta_r_s numeric not null,
  pedidos_ifood int,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- PlacarIfood (v3 2.9).
create table if not exists public.placar_ifood (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  semana text not null,
  nota_media numeric not null,
  avaliacoes90d int not null default 0,
  pedidos90d int not null default 0,
  cancelamentos int not null default 0,
  cancelamentos_falha_loja int not null default 0,
  pedidos_com_erro int not null default 0,
  tempo_medio_preparo_min numeric,
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 1.2 Colunas que o app já envia.
-- criada_por: quem criou a empresa, gravado pelo servidor (gatilho), nunca pelo aparelho.
alter table public.empresas add column if not exists criada_por text;

alter table public.configs
  add column if not exists taxa_maquininha numeric default 0,
  add column if not exists comissao_ifood numeric,
  add column if not exists embalagem_ifood numeric default 1,
  add column if not exists mensalidade_ifood numeric default 150,
  add column if not exists limite_mensalidade_ifood numeric default 1800,
  add column if not exists repasse_ifood text default 'semanal',
  add column if not exists encargos_folha numeric default 1.30,
  add column if not exists fator_dsr numeric default 0.20,
  add column if not exists tarifa_onibus numeric default 5.80,
  add column if not exists salario_minimo numeric default 1412,
  add column if not exists dias_validade int default 10,
  add column if not exists dias_max_no_ponto int default 7,
  add column if not exists semanas_por_mes numeric default 4.333,
  add column if not exists diaria_producao numeric default 0,
  add column if not exists capacidade_jornada int default 0,
  add column if not exists gas_mes_referencia numeric default 0,
  add column if not exists formas_referencia int default 0,
  add column if not exists provisao_imposto numeric default 0,
  add column if not exists preco_final_revenda numeric default 0,
  add column if not exists hora_virada_dia int default 4,
  add column if not exists meta_loja_dia numeric default 0;

alter table public.produtos
  add column if not exists ifood boolean default false,
  add column if not exists vende_no_ifood boolean,
  add column if not exists obs_ifood text,
  add column if not exists escolha_sabores jsonb,
  add column if not exists ordem int default 0;

alter table public.vendas
  add column if not exists desconto numeric,
  add column if not exists frete_loja numeric,
  add column if not exists cancelada boolean default false,
  add column if not exists motivo_cancelamento text;

alter table public.venda_itens add column if not exists sabor_escolhido_id uuid;

-- 1.3 funcionarios: o app manda usa_v_t e dias_mes_v_t (de usaVT e diasMesVT).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'funcionarios' and column_name = 'usa_vt')
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'funcionarios' and column_name = 'usa_v_t') then
    alter table public.funcionarios rename column usa_vt to usa_v_t;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'funcionarios' and column_name = 'dias_mes_vt')
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'funcionarios' and column_name = 'dias_mes_v_t') then
    alter table public.funcionarios rename column dias_mes_vt to dias_mes_v_t;
  end if;
end;
$$;

alter table public.funcionarios
  add column if not exists usa_v_t boolean default false,
  add column if not exists dias_mes_v_t int default 26;

-- 1.4 Criador das empresas que já existem: o primeiro membro; sem membro (empresa órfã), quem gravou
-- a empresa. Os dois vêm de colunas que o aparelho escrevia (created_at, updated_by): não provam
-- autoria. criada_por só decide algo na empresa órfã (quem pode reivindicá-la); as órfãs e todos os
-- vínculos aparecem na auditoria de verificacao_rls.sql para o dono conferir.
update public.empresas e
set criada_por = coalesce(
  (select m.user_id from public.membros m where m.empresa_id = e.id order by m.created_at, m.id limit 1),
  nullif(e.updated_by, '')
)
where e.criada_por is null;

-- 1.5 Restos do período em que o RLS estava aberto.
do $$
declare
  v_qtd bigint;
begin
  -- empresa_id da empresa é o próprio id (contrato do app). Linha adulterada travaria o dono para
  -- sempre: a política exige empresa_id = id e o gatilho não deixa empresa_id mudar pelo app.
  update public.empresas set empresa_id = id where empresa_id is distinct from id;

  -- Qualquer conta podia gravar convite em qualquer empresa (o id das empresas era legível por
  -- todos). Um convite plantado com código conhecido e validade longa seria a porta de volta pelo
  -- aceitar_convite. Todos os pendentes saem (exclusão lógica); quem precisar gera outro código.
  -- Só na primeira aplicação (a função abaixo ainda não existe): rodar de novo não apaga convite novo.
  if to_regprocedure('public.empresas_com_papel(text[])') is null then
    update public.convites set deleted_at = now()
    where deleted_at is null and usado_por is null and expira_em > now();
    get diagnostics v_qtd = row_count;
    raise notice 'Convites pendentes invalidados: %', v_qtd;
  end if;
end;
$$;

-- 1.6 Colunas de que gatilhos e políticas dependem, com o tipo esperado. Banco diferente do esperado
-- para aqui, com a lista, antes de mexer em gatilho ou política (a transação desfaz o que veio antes).
do $$
declare
  v_erros text;
begin
  with esperado(tabela, coluna, tipo) as (
    select t, c.coluna, c.tipo
    from unnest(array[
      'empresas', 'membros', 'convites', 'configs', 'insumos', 'compras', 'lista_compras', 'sabores',
      'receita_itens', 'tamanhos', 'produtos', 'producoes', 'producao_itens', 'lotes', 'movimentos',
      'canais', 'vendas', 'venda_itens', 'parceiros', 'visitas_ponto', 'perdas', 'amostras', 'contagens',
      'custos_fixos', 'rotina_tarefas', 'tarefas_avulsas', 'checklist_itens', 'recados_mentor',
      'notas_mentor', 'configs_mentor', 'promocoes', 'zonas', 'funcionarios', 'mudancas_fase',
      'metricas_ifood', 'cancelamentos', 'metas_semana', 'placar_ifood'
    ]) as t
    cross join (values
      ('id', 'uuid'), ('empresa_id', 'uuid'), ('updated_at', 'timestamp with time zone'),
      ('updated_by', 'text'), ('deleted_at', 'timestamp with time zone')
    ) as c(coluna, tipo)
    union all values
      ('empresas', 'criada_por', 'text'),
      ('membros', 'user_id', 'text'), ('membros', 'papel', 'text'), ('membros', 'parceiro_id', 'uuid'),
      ('convites', 'codigo', 'text'), ('convites', 'papel', 'text'), ('convites', 'usado_por', 'text'),
      ('convites', 'expira_em', 'timestamp with time zone'),
      ('canais', 'tipo', 'text'), ('vendas', 'canal', 'text'), ('venda_itens', 'venda_id', 'uuid'),
      ('movimentos', 'tipo', 'text'), ('tarefas_avulsas', 'papel', 'text'),
      ('custos_fixos', 'visibilidade', 'text'), ('funcionarios', 'membro_id', 'uuid'),
      ('mudancas_fase', 'funcionario_id', 'uuid')
  )
  select string_agg(format('%s.%s (%s)', e.tabela, e.coluna, coalesce(c.data_type, 'ausente')), ', ')
  into v_erros
  from esperado e
  left join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = e.tabela and c.column_name = e.coluna
  where c.data_type is distinct from e.tipo;

  if v_erros is not null then
    raise exception 'Colunas ausentes ou com tipo diferente do esperado: %', v_erros;
  end if;
end;
$$;

-- >>> SEGURANÇA (bloco idêntico em supabase/schema.sql e na migração 20261016120000_seguranca_rls.sql) ---

-- -----------------------------------------------------------------------------
-- S1. GATILHOS
-- -----------------------------------------------------------------------------

-- updated_at do servidor e autoria vinda do token (o aparelho não escolhe quem gravou).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid()::text;
  end if;
  return new;
end;
$$;

-- empresas.criada_por: no insert vem do token; depois não muda.
create or replace function public.fixar_criador_empresa()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.criada_por := auth.uid()::text;
  else
    new.criada_por := old.criada_por;
  end if;
  return new;
end;
$$;

-- Nenhuma linha muda de empresa (falha 3) nem de id: o id liga as linhas entre si (venda_id,
-- membro_id das fichas) e o upsert do app nunca o altera.
create or replace function public.impedir_troca_de_empresa()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
     and (new.empresa_id is distinct from old.empresa_id or new.id is distinct from old.id) then
    raise exception 'id e empresa_id não podem mudar (%).', tg_table_name using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Papel, conta e parceiro do membro só mudam por convite ou pelo suporte.
create or replace function public.proteger_membro()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.papel is distinct from old.papel
     or new.parceiro_id is distinct from old.parceiro_id then
    raise exception 'Papel e conta do membro não mudam pelo app.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Um vínculo ativo por pessoa e empresa, e um dono ativo por empresa, mesmo que os índices únicos de
-- S4 não existam (banco com duplicata antiga). Vale quando um vínculo passa a ser ativo: insert
-- ativo, reativação, ou troca de conta/papel/empresa pelo suporte; o reenvio de um vínculo que já
-- está ativo, igual, passa direto. A trava por empresa serializa envios simultâneos, e um gatilho de
-- linha enxerga as linhas anteriores do mesmo comando (um upsert com dois vínculos da mesma pessoa
-- não passa). Security definer: precisa ver todos os vínculos.
create or replace function public.garantir_vinculo_unico()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.deleted_at is null
     and new.empresa_id = old.empresa_id and new.user_id = old.user_id and new.papel = old.papel then
    return new;
  end if;
  if tg_op = 'INSERT' and exists (
    select 1 from public.membros
    where id = new.id and deleted_at is null
      and empresa_id = new.empresa_id and user_id = new.user_id and papel = new.papel
  ) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('membros:' || new.empresa_id::text, 0));

  if exists (
    select 1 from public.membros
    where empresa_id = new.empresa_id and user_id = new.user_id and deleted_at is null and id <> new.id
  ) then
    raise exception 'Esta conta já tem vínculo ativo nesta empresa.' using errcode = '23505';
  end if;
  if new.papel = 'dono' and exists (
    select 1 from public.membros
    where empresa_id = new.empresa_id and papel = 'dono' and deleted_at is null and id <> new.id
  ) then
    raise exception 'A empresa já tem dono.' using errcode = '23505';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- S2. FUNÇÕES AUXILIARES DE RLS (security definer: leem membros/empresas sem passar pelo RLS,
-- o que evita recursão; search_path fixo contra sequestro de nomes).
-- -----------------------------------------------------------------------------

-- Empresas em que o usuário é membro ativo com um dos papéis. Durante a implantação o criador
-- (dono ou mentor) vale por todos os papéis. Sem argumento de linha: nas políticas, entra como
-- `empresa_id in (select ...)` e roda uma vez por consulta, não por linha.
create or replace function public.empresas_com_papel(p_papeis text[])
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.empresa_id
  from public.membros m
  where m.user_id = auth.uid()::text
    and m.deleted_at is null
    and (
      m.papel = any (p_papeis)
      or (
        m.papel in ('dono', 'mentor')
        and not exists (
          select 1 from public.membros o
          where o.empresa_id = m.empresa_id and o.user_id <> m.user_id
        )
      )
    );
$$;

-- Nenhum membro, nem removido, jamais passou pela empresa.
create or replace function public.empresa_sem_membros(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (select 1 from public.membros where empresa_id = p_empresa_id);
$$;

-- O usuário criou a empresa e ela ainda não tem membro: só assim alguém entra sem convite.
create or replace function public.empresa_vazia_criada_por_mim(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
           select 1 from public.empresas e
           where e.id = p_empresa_id and e.criada_por = auth.uid()::text
         )
     and not exists (select 1 from public.membros where empresa_id = p_empresa_id);
$$;

-- O vínculo já existe com a mesma empresa, conta e papel. O Postgres aplica a política de INSERT ao
-- upsert ANTES de saber que há conflito; sem isto, o reenvio do próprio vínculo (último acesso) e a
-- desativação de um membro pelo dono seriam recusados. Com a linha existente o upsert segue pelo
-- caminho do UPDATE, que tem política e gatilhos próprios.
create or replace function public.membro_existe(p_id uuid, p_empresa_id uuid, p_user_id text, p_papel text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membros
    where id = p_id and empresa_id = p_empresa_id and user_id = p_user_id and papel = p_papel
  );
$$;

create or replace function public.meus_membros()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.membros where user_id = auth.uid()::text and deleted_at is null;
$$;

-- Fichas (funcionarios) ligadas aos membros ativos do usuário.
create or replace function public.minhas_fichas()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.id
  from public.funcionarios f
  where f.membro_id in (
    select m.id from public.membros m where m.user_id = auth.uid()::text and m.deleted_at is null
  );
$$;

-- Mantidas por compatibilidade (o schema antigo as criava), agora com search_path fixo.
create or replace function public.get_papel_usuario(p_empresa_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select papel from public.membros
  where empresa_id = p_empresa_id
    and user_id = auth.uid()::text
    and deleted_at is null
  order by created_at
  limit 1;
$$;

create or replace function public.pertence_empresa(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membros
    where empresa_id = p_empresa_id
      and user_id = auth.uid()::text
      and deleted_at is null
  );
$$;

-- -----------------------------------------------------------------------------
-- S3. POR TABELA: gatilhos, índice de sync, RLS ligado, políticas antigas removidas (todas, com
-- qualquer nome: política permissiva que sobrasse reabriria o acesso) e privilégios.
-- anon e PUBLIC ficam sem acesso; authenticated só com SELECT, INSERT e UPDATE (exclusão é lógica).
-- revoke all antes do grant: não sobra DELETE, TRUNCATE, MAINTAIN (PG 17) nem privilégio futuro.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'empresas', 'membros', 'convites', 'configs', 'insumos', 'compras', 'lista_compras', 'sabores',
    'receita_itens', 'tamanhos', 'produtos', 'producoes', 'producao_itens', 'lotes', 'movimentos',
    'canais', 'vendas', 'venda_itens', 'parceiros', 'visitas_ponto', 'perdas', 'amostras', 'contagens',
    'custos_fixos', 'rotina_tarefas', 'tarefas_avulsas', 'checklist_itens', 'recados_mentor',
    'notas_mentor', 'configs_mentor', 'promocoes', 'zonas', 'funcionarios', 'mudancas_fase',
    'metricas_ifood', 'cancelamentos', 'metas_semana', 'placar_ifood'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_' || t || '_updated_at', t);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.set_updated_at()',
      'trg_' || t || '_updated_at', t);
    execute format('drop trigger if exists %I on public.%I', 'trg_' || t || '_empresa_fixa', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.impedir_troca_de_empresa()',
      'trg_' || t || '_empresa_fixa', t);

    execute format('create index if not exists %I on public.%I (empresa_id, updated_at)', 'idx_' || t || '_empresa_updated', t);

    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end;
$$;

drop trigger if exists trg_empresas_criador on public.empresas;
create trigger trg_empresas_criador
  before insert or update on public.empresas
  for each row execute function public.fixar_criador_empresa();

drop trigger if exists trg_membros_protecao on public.membros;
create trigger trg_membros_protecao
  before update on public.membros
  for each row execute function public.proteger_membro();

drop trigger if exists trg_membros_vinculo on public.membros;
create trigger trg_membros_vinculo
  before insert or update on public.membros
  for each row execute function public.garantir_vinculo_unico();

create index if not exists idx_membros_user_id on public.membros (user_id);
create index if not exists idx_convites_codigo on public.convites (codigo);

-- -----------------------------------------------------------------------------
-- S4. INTEGRIDADE DE MEMBROS
-- Um vínculo ativo por pessoa e empresa (impede o criador de se cadastrar duas vezes, com dois
-- papéis, no mesmo envio) e um único dono por empresa. Se o banco já tiver duplicatas, o índice
-- não é criado (o gatilho garantir_vinculo_unico segura os vínculos novos): resolva pela auditoria
-- de verificacao_rls.sql e rode esta migração de novo.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.membros where deleted_at is null
    group by empresa_id, user_id having count(*) > 1
  ) then
    raise warning 'uq_membros_vinculo_ativo NÃO criado: há pessoa com dois vínculos ativos na mesma empresa.';
  else
    create unique index if not exists uq_membros_vinculo_ativo
      on public.membros (empresa_id, user_id) where deleted_at is null;
  end if;

  if exists (
    select 1 from public.membros where deleted_at is null and papel = 'dono'
    group by empresa_id having count(*) > 1
  ) then
    raise warning 'uq_membros_um_dono NÃO criado: há empresa com mais de um dono ativo.';
  else
    create unique index if not exists uq_membros_um_dono
      on public.membros (empresa_id) where deleted_at is null and papel = 'dono';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- S5. POLÍTICAS
-- Uma política por comando (select, insert, update), só para authenticated. Sem DELETE.
-- -----------------------------------------------------------------------------

-- S5.1 Tabelas em que a regra é só "papel na empresa".
-- RLS é por linha: quem lê a linha lê todas as colunas dela. Ex.: a equipe precisa de meta, super
-- meta e pedidos de metas_semana e por isso lê também a `nota` da semana.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      -- tabela              leitura                  escrita
      ('convites',        '{dono,mentor}',        '{dono,mentor}'),
      ('configs',         '{dono,mentor,equipe}', '{dono}'),
      ('insumos',         '{dono,mentor,equipe}', '{dono}'),
      ('compras',         '{dono,mentor,equipe}', '{dono}'),
      ('lista_compras',   '{dono,mentor,equipe}', '{dono,equipe}'),
      ('sabores',         '{dono,mentor,equipe}', '{dono}'),
      ('receita_itens',   '{dono,mentor,equipe}', '{dono}'),
      ('tamanhos',        '{dono,mentor,equipe}', '{dono}'),
      ('produtos',        '{dono,mentor,equipe}', '{dono}'),
      ('promocoes',       '{dono,mentor,equipe}', '{dono}'),
      ('rotina_tarefas',  '{dono,mentor,equipe}', '{dono}'),
      ('metas_semana',    '{dono,mentor,equipe}', '{dono}'),
      ('producoes',       '{dono,mentor,equipe}', '{dono,equipe}'),
      ('producao_itens',  '{dono,mentor,equipe}', '{dono,equipe}'),
      ('lotes',           '{dono,mentor,equipe}', '{dono,equipe}'),
      ('perdas',          '{dono,mentor,equipe}', '{dono,equipe}'),
      ('amostras',        '{dono,mentor,equipe}', '{dono,equipe}'),
      ('contagens',       '{dono,mentor,equipe}', '{dono,equipe}'),
      ('checklist_itens', '{dono,mentor,equipe}', '{dono,equipe}'),
      ('parceiros',       '{dono,mentor}',        '{dono}'),
      ('visitas_ponto',   '{dono,mentor}',        '{dono}'),
      ('zonas',           '{dono,mentor}',        '{dono}'),
      ('metricas_ifood',  '{dono,mentor}',        '{dono}'),
      ('cancelamentos',   '{dono,mentor}',        '{dono}'),
      ('placar_ifood',    '{dono,mentor}',        '{dono}'),
      ('recados_mentor',  '{dono,mentor}',        '{dono,mentor}'),
      ('notas_mentor',    '{mentor}',             '{mentor}'),
      ('configs_mentor',  '{mentor}',             '{mentor}')
    ) as v(tabela, leitura, escrita)
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (empresa_id in (select public.empresas_com_papel(%L)))',
      r.tabela || '_select', r.tabela, r.leitura);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (empresa_id in (select public.empresas_com_papel(%L)))',
      r.tabela || '_insert', r.tabela, r.escrita);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (empresa_id in (select public.empresas_com_papel(%L)))
         with check (empresa_id in (select public.empresas_com_papel(%L)))',
      r.tabela || '_update', r.tabela, r.escrita, r.escrita);
  end loop;
end;
$$;

-- S5.2 empresas: membro lê; só o dono altera; qualquer conta cria a sua (criada_por = ela).
-- O criador enxerga e reenvia a empresa enquanto o membro dele ainda não chegou.
create policy empresas_select on public.empresas for select to authenticated
  using (
    id in (select public.empresas_com_papel('{dono,mentor,equipe,parceiro}'))
    or (criada_por = (select auth.uid())::text and public.empresa_sem_membros(id))
  );

create policy empresas_insert on public.empresas for insert to authenticated
  with check (
    empresa_id = id
    and criada_por = (select auth.uid())::text
    and deleted_at is null
  );

create policy empresas_update on public.empresas for update to authenticated
  using (
    id in (select public.empresas_com_papel('{dono}'))
    or (criada_por = (select auth.uid())::text and public.empresa_sem_membros(id))
  )
  with check (
    empresa_id = id
    and (
      id in (select public.empresas_com_papel('{dono}'))
      or (criada_por = (select auth.uid())::text and public.empresa_sem_membros(id))
    )
  );

-- S5.3 membros: cada um lê o próprio; dono e mentor leem todos da empresa.
-- Entrada sem convite só para o primeiro membro (o criador, como dono ou mentor); o resto entra
-- por aceitar_convite. O upsert de um vínculo que já existe passa pelo INSERT (membro_existe) e é
-- decidido pelo UPDATE. Cada um atualiza o próprio vínculo ativo (último acesso) e continua ativo;
-- vínculo desativado não se reativa. O dono pode desativar os outros. Papel e conta: gatilho
-- proteger_membro; duplicidade: gatilho garantir_vinculo_unico.
create policy membros_select on public.membros for select to authenticated
  using (
    user_id = (select auth.uid())::text
    or empresa_id in (select public.empresas_com_papel('{dono,mentor}'))
  );

create policy membros_insert on public.membros for insert to authenticated
  with check (
    public.membro_existe(id, empresa_id, user_id, papel)
    or (
      user_id = (select auth.uid())::text
      and papel in ('dono', 'mentor')
      and deleted_at is null
      and public.empresa_vazia_criada_por_mim(empresa_id)
    )
  );

create policy membros_update on public.membros for update to authenticated
  using (
    (user_id = (select auth.uid())::text and deleted_at is null)
    or empresa_id in (select public.empresas_com_papel('{dono}'))
  )
  with check (
    (
      user_id = (select auth.uid())::text
      and deleted_at is null
      and empresa_id in (select public.empresas_com_papel('{dono,mentor,equipe,parceiro}'))
    )
    or (
      user_id <> (select auth.uid())::text
      and empresa_id in (select public.empresas_com_papel('{dono}'))
    )
  );

-- S5.4 canais: a equipe só vê os canais diretos (preço de repasse e da rede é confidencial).
create policy canais_select on public.canais for select to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono,mentor}'))
    or (tipo = 'direto' and empresa_id in (select public.empresas_com_papel('{equipe}')))
  );

create policy canais_insert on public.canais for insert to authenticated
  with check (empresa_id in (select public.empresas_com_papel('{dono}')));

create policy canais_update on public.canais for update to authenticated
  using (empresa_id in (select public.empresas_com_papel('{dono}')))
  with check (empresa_id in (select public.empresas_com_papel('{dono}')));

-- S5.5 vendas: a equipe lê e lança só loja e iFood (inclui pedido cancelado); o mentor só lê.
create policy vendas_select on public.vendas for select to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono,mentor}'))
    or (canal in ('loja', 'ifood') and empresa_id in (select public.empresas_com_papel('{equipe}')))
  );

create policy vendas_insert on public.vendas for insert to authenticated
  with check (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (canal in ('loja', 'ifood') and empresa_id in (select public.empresas_com_papel('{equipe}')))
  );

create policy vendas_update on public.vendas for update to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (canal in ('loja', 'ifood') and empresa_id in (select public.empresas_com_papel('{equipe}')))
  )
  with check (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (canal in ('loja', 'ifood') and empresa_id in (select public.empresas_com_papel('{equipe}')))
  );

-- S5.6 venda_itens: seguem a venda (a venda sobe antes dos itens na fila).
create policy venda_itens_select on public.venda_itens for select to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono,mentor}'))
    or (
      empresa_id in (select public.empresas_com_papel('{equipe}'))
      and exists (
        select 1 from public.vendas v
        where v.id = venda_itens.venda_id
          and v.empresa_id = venda_itens.empresa_id
          and v.canal in ('loja', 'ifood')
      )
    )
  );

create policy venda_itens_insert on public.venda_itens for insert to authenticated
  with check (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (
      empresa_id in (select public.empresas_com_papel('{equipe}'))
      and exists (
        select 1 from public.vendas v
        where v.id = venda_itens.venda_id
          and v.empresa_id = venda_itens.empresa_id
          and v.canal in ('loja', 'ifood')
      )
    )
  );

create policy venda_itens_update on public.venda_itens for update to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (
      empresa_id in (select public.empresas_com_papel('{equipe}'))
      and exists (
        select 1 from public.vendas v
        where v.id = venda_itens.venda_id
          and v.empresa_id = venda_itens.empresa_id
          and v.canal in ('loja', 'ifood')
      )
    )
  )
  with check (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (
      empresa_id in (select public.empresas_com_papel('{equipe}'))
      and exists (
        select 1 from public.vendas v
        where v.id = venda_itens.venda_id
          and v.empresa_id = venda_itens.empresa_id
          and v.canal in ('loja', 'ifood')
      )
    )
  );

-- S5.7 movimentos: todos leem (o estoque é a soma de todos); a equipe só gera os tipos da
-- operação dela (venda, produção, perda, amostra, contagem). Repasse e troca são do dono.
create policy movimentos_select on public.movimentos for select to authenticated
  using (empresa_id in (select public.empresas_com_papel('{dono,mentor,equipe}')));

create policy movimentos_insert on public.movimentos for insert to authenticated
  with check (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (
      tipo in ('venda', 'producao', 'perda', 'amostra', 'ajuste_contagem')
      and empresa_id in (select public.empresas_com_papel('{equipe}'))
    )
  );

create policy movimentos_update on public.movimentos for update to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (
      tipo in ('venda', 'producao', 'perda', 'amostra', 'ajuste_contagem')
      and empresa_id in (select public.empresas_com_papel('{equipe}'))
    )
  )
  with check (
    empresa_id in (select public.empresas_com_papel('{dono}'))
    or (
      tipo in ('venda', 'producao', 'perda', 'amostra', 'ajuste_contagem')
      and empresa_id in (select public.empresas_com_papel('{equipe}'))
    )
  );

-- S5.8 tarefas_avulsas: dono e mentor escrevem; a equipe lê só as dela.
create policy tarefas_avulsas_select on public.tarefas_avulsas for select to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono,mentor}'))
    or (papel = 'equipe' and empresa_id in (select public.empresas_com_papel('{equipe}')))
  );

create policy tarefas_avulsas_insert on public.tarefas_avulsas for insert to authenticated
  with check (empresa_id in (select public.empresas_com_papel('{dono,mentor}')));

create policy tarefas_avulsas_update on public.tarefas_avulsas for update to authenticated
  using (empresa_id in (select public.empresas_com_papel('{dono,mentor}')))
  with check (empresa_id in (select public.empresas_com_papel('{dono,mentor}')));

-- S5.9 custos_fixos: dono lê e escreve os de visibilidade 'todos'; mentor lê todos e escreve os
-- dele ('mentor'); a equipe não vê nenhum. Ninguém muda a visibilidade para o outro lado.
create policy custos_fixos_select on public.custos_fixos for select to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{mentor}'))
    or (visibilidade = 'todos' and empresa_id in (select public.empresas_com_papel('{dono}')))
  );

create policy custos_fixos_insert on public.custos_fixos for insert to authenticated
  with check (
    (visibilidade = 'todos' and empresa_id in (select public.empresas_com_papel('{dono}')))
    or (visibilidade = 'mentor' and empresa_id in (select public.empresas_com_papel('{mentor}')))
  );

create policy custos_fixos_update on public.custos_fixos for update to authenticated
  using (
    (visibilidade = 'todos' and empresa_id in (select public.empresas_com_papel('{dono}')))
    or (visibilidade = 'mentor' and empresa_id in (select public.empresas_com_papel('{mentor}')))
  )
  with check (
    (visibilidade = 'todos' and empresa_id in (select public.empresas_com_papel('{dono}')))
    or (visibilidade = 'mentor' and empresa_id in (select public.empresas_com_papel('{mentor}')))
  );

-- S5.10 funcionarios e mudancas_fase: dono edita, mentor lê, a funcionária lê só a ficha dela.
create policy funcionarios_select on public.funcionarios for select to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono,mentor}'))
    or (
      membro_id in (select public.meus_membros())
      and empresa_id in (select public.empresas_com_papel('{equipe}'))
    )
  );

create policy funcionarios_insert on public.funcionarios for insert to authenticated
  with check (empresa_id in (select public.empresas_com_papel('{dono}')));

create policy funcionarios_update on public.funcionarios for update to authenticated
  using (empresa_id in (select public.empresas_com_papel('{dono}')))
  with check (empresa_id in (select public.empresas_com_papel('{dono}')));

create policy mudancas_fase_select on public.mudancas_fase for select to authenticated
  using (
    empresa_id in (select public.empresas_com_papel('{dono,mentor}'))
    or (
      funcionario_id in (select public.minhas_fichas())
      and empresa_id in (select public.empresas_com_papel('{equipe}'))
    )
  );

create policy mudancas_fase_insert on public.mudancas_fase for insert to authenticated
  with check (empresa_id in (select public.empresas_com_papel('{dono}')));

create policy mudancas_fase_update on public.mudancas_fase for update to authenticated
  using (empresa_id in (select public.empresas_com_papel('{dono}')))
  with check (empresa_id in (select public.empresas_com_papel('{dono}')));

-- -----------------------------------------------------------------------------
-- S6. RPC aceitar_convite: única porta de entrada depois do criador.
-- -----------------------------------------------------------------------------
create or replace function public.aceitar_convite(p_codigo text, p_nome text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text := auth.uid()::text;
  v_nome text := left(btrim(coalesce(p_nome, '')), 80);
  v_convite public.convites%rowtype;
  v_membro_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;
  if v_nome = '' then
    raise exception 'Informe seu nome.';
  end if;

  -- for update: dois aparelhos com o mesmo código não entram os dois.
  select c.* into v_convite
  from public.convites c
  where upper(c.codigo) = upper(btrim(coalesce(p_codigo, '')))
    and c.deleted_at is null
    and c.usado_por is null
    and c.expira_em > now()
    and exists (select 1 from public.empresas e where e.id = c.empresa_id and e.deleted_at is null)
  limit 1
  for update of c;

  if not found then
    raise exception 'Código inválido, já usado ou vencido.';
  end if;

  -- Serializa as entradas na mesma empresa (regra do dono único sem corrida).
  perform 1 from public.empresas where id = v_convite.empresa_id for update;

  if exists (
    select 1 from public.membros
    where empresa_id = v_convite.empresa_id and user_id = v_user_id and deleted_at is null
  ) then
    raise exception 'Você já faz parte desta empresa.';
  end if;

  if v_convite.papel = 'dono' and exists (
    select 1 from public.membros
    where empresa_id = v_convite.empresa_id and papel = 'dono' and deleted_at is null
  ) then
    raise exception 'A empresa já tem dono.';
  end if;

  insert into public.membros (id, empresa_id, user_id, papel, nome, updated_by)
  values (v_membro_id, v_convite.empresa_id, v_user_id, v_convite.papel, v_nome, v_user_id);

  update public.convites
  set usado_por = v_nome, updated_by = v_user_id
  where id = v_convite.id;

  return json_build_object(
    'empresa_id', v_convite.empresa_id,
    'membro_id', v_membro_id,
    'papel', v_convite.papel,
    'user_id', v_user_id
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- S7. EXECUTE DAS FUNÇÕES: anon não executa nada. As auxiliares precisam de authenticated porque
-- as políticas rodam com o papel de quem consulta.
-- -----------------------------------------------------------------------------
revoke execute on function
  public.set_updated_at(),
  public.fixar_criador_empresa(),
  public.impedir_troca_de_empresa(),
  public.proteger_membro(),
  public.garantir_vinculo_unico(),
  public.empresas_com_papel(text[]),
  public.empresa_sem_membros(uuid),
  public.empresa_vazia_criada_por_mim(uuid),
  public.membro_existe(uuid, uuid, text, text),
  public.meus_membros(),
  public.minhas_fichas(),
  public.get_papel_usuario(uuid),
  public.pertence_empresa(uuid),
  public.aceitar_convite(text, text)
from public, anon;

grant execute on function
  public.set_updated_at(),
  public.fixar_criador_empresa(),
  public.impedir_troca_de_empresa(),
  public.proteger_membro(),
  public.garantir_vinculo_unico(),
  public.empresas_com_papel(text[]),
  public.empresa_sem_membros(uuid),
  public.empresa_vazia_criada_por_mim(uuid),
  public.membro_existe(uuid, uuid, text, text),
  public.meus_membros(),
  public.minhas_fichas(),
  public.get_papel_usuario(uuid),
  public.pertence_empresa(uuid),
  public.aceitar_convite(text, text)
to authenticated, service_role;

-- <<< SEGURANÇA --------------------------------------------------------------------------------

commit;
