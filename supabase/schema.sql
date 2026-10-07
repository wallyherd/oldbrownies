-- Schema Supabase para Old Brownies
-- Baseado no modelo B3 e no contrato esperado do backend (README.md)

create extension if not exists "pgcrypto";

-- Função de trigger para atualizar updated_at automaticamente em todo insert/update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1. EMPRESAS
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default gen_random_uuid(),
  nome text not null,
  razao_social text default '',
  cnpj text default '',
  chave_pix text default '',
  endereco text default '',
  fuso text default 'America/Cuiaba',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 2. MEMBROS
create table if not exists public.membros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  user_id text not null,
  papel text not null check (papel in ('dono', 'mentor', 'equipe', 'parceiro')),
  nome text not null,
  parceiro_id uuid,
  ultimo_acesso timestamptz,
  pendentes_sync int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 3. CONVITES
create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  papel text not null check (papel in ('dono', 'mentor', 'equipe', 'parceiro')),
  criado_por text not null,
  usado_por text,
  expira_em timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 4. CONFIGS
create table if not exists public.configs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  taxa_maquininha numeric default 0,
  comissao_ifood numeric,
  dias_validade int default 10,
  dias_max_no_ponto int default 7,
  semanas_por_mes numeric default 4.33,
  diaria_producao numeric default 0,
  capacidade_jornada int default 0,
  gas_mes_referencia numeric default 0,
  formas_referencia int default 0,
  provisao_imposto numeric default 0,
  preco_final_revenda numeric default 0,
  hora_virada_dia int default 4,
  meta_loja_dia numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 5. INSUMOS
create table if not exists public.insumos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  nome text not null,
  unidade text not null,
  preco_manual numeric default 0,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 6. COMPRAS
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  insumo_id uuid not null,
  quantidade numeric not null,
  valor_total numeric not null,
  fornecedor text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 6.5. LISTA_COMPRAS
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

-- 7. SABORES
create table if not exists public.sabores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  nome text not null,
  peso_mix numeric default 0,
  validade_dias int default 10,
  so_encomenda boolean default false,
  ativo boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 8. RECEITA_ITENS
create table if not exists public.receita_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  sabor_id uuid not null,
  insumo_id uuid not null,
  quantidade numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 9. TAMANHOS
create table if not exists public.tamanhos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  pecas_por_forma int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 10. PRODUTOS
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  tipo text not null check (tipo in ('brownie', 'combo', 'bebida', 'salgado')),
  nome text not null,
  sabor_id uuid,
  tamanho text,
  preco_loja numeric default 0,
  custo_manual numeric,
  composicao jsonb default '[]'::jsonb,
  observacao text,
  ifood boolean default false,
  ordem int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 11. PRODUCOES
create table if not exists public.producoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  responsavel text not null,
  diaria_paga numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 12. PRODUCAO_ITENS
create table if not exists public.producao_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  producao_id uuid not null,
  sabor_id uuid not null,
  tamanho text not null,
  formas numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 13. LOTES
create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  producao_item_id uuid not null,
  sabor_id uuid not null,
  tamanho text not null,
  qtd_inicial int not null,
  validade_ate text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 14. MOVIMENTOS
create table if not exists public.movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  dia_comercial text not null,
  lote_id uuid,
  sabor_id uuid not null,
  tamanho text not null,
  qtd int not null,
  tipo text not null,
  ref_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 15. CANAIS
create table if not exists public.canais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  nome text not null,
  tipo text not null check (tipo in ('direto', 'parceiro')),
  tamanho_padrao text not null,
  preco_padrao numeric,
  comissao numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 16. VENDAS
create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  dia_comercial text not null,
  canal text not null,
  parceiro_id uuid,
  feira_nome text,
  pagamento text not null,
  registrada_por text not null,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 17. VENDA_ITENS
create table if not exists public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  venda_id uuid not null,
  produto_id uuid,
  sabor_id uuid,
  tamanho text,
  qtd int not null,
  preco_unitario numeric not null,
  custo_unitario numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 18. PARCEIROS
create table if not exists public.parceiros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  tipo text not null,
  nome text not null,
  whatsapp text default '',
  status text not null,
  zona text,
  noites jsonb default '[]'::jsonb,
  polo text,
  endereco text,
  dia_visita int,
  fim_teste text,
  data_entrada text not null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 19. VISITAS_PONTO
create table if not exists public.visitas_ponto (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  parceiro_id uuid not null,
  contado_no_balcao int default 0,
  trocado int default 0,
  reposto_sem_custo int default 0,
  venda_id uuid,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 20. PERDAS
create table if not exists public.perdas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  lote_id uuid,
  sabor_id uuid not null,
  tamanho text not null,
  qtd int not null,
  motivo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 21. AMOSTRAS
create table if not exists public.amostras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  local text not null,
  qtd int not null,
  de_recorte boolean default false,
  sabor_id uuid,
  tamanho text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 22. CONTAGENS
create table if not exists public.contagens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  itens jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 23. CUSTOS_FIXOS
create table if not exists public.custos_fixos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  nome text not null,
  valor_mensal numeric not null,
  grupo text not null,
  visibilidade text not null check (visibilidade in ('todos', 'mentor')),
  inicio text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 24. ROTINA_TAREFAS
create table if not exists public.rotina_tarefas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  dia_semana int not null,
  inicio text not null,
  fim text not null,
  titulo text not null,
  detalhe text default '',
  tipo text not null,
  obrigatoria boolean default false,
  atalho text,
  papel text not null,
  ordem int default 0,
  ativa boolean default true,
  valida_de text,
  valida_ate text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 25. TAREFAS_AVULSAS
create table if not exists public.tarefas_avulsas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  titulo text not null,
  detalhe text default '',
  origem text not null,
  papel text,
  feita_em text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 26. CHECKLIST_ITENS
create table if not exists public.checklist_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  data text not null,
  rotina_tarefa_id uuid,
  tarefa_avulsa_id uuid,
  status text not null,
  marcado_em text not null,
  marcado_por text not null,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 27. RECADOS_MENTOR
create table if not exists public.recados_mentor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  texto text not null,
  criado_em text not null,
  lido_em text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 28. NOTAS_MENTOR
create table if not exists public.notas_mentor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  texto text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 29. CONFIGS_MENTOR
create table if not exists public.configs_mentor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  limites_faturamento jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 30. PROMOCOES
create table if not exists public.promocoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  oferta text not null,
  cliente_paga numeric not null,
  brownies int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- 31. ZONAS
create table if not exists public.zonas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  nome text not null,
  ruas text default '',
  melhores_noites text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  deleted_at timestamptz
);

-- TRIGGERS DE UPDATED_AT EM TODAS AS 31 TABELAS
do $$
declare
  t text;
  tabelas text[] := array[
    'empresas', 'membros', 'convites', 'configs', 'insumos', 'compras', 'lista_compras', 'sabores',
    'receita_itens', 'tamanhos', 'produtos', 'producoes', 'producao_itens', 'lotes',
    'movimentos', 'canais', 'vendas', 'venda_itens', 'parceiros', 'visitas_ponto',
    'perdas', 'amostras', 'contagens', 'custos_fixos', 'rotina_tarefas',
    'tarefas_avulsas', 'checklist_itens', 'recados_mentor', 'notas_mentor',
    'configs_mentor', 'promocoes', 'zonas'
  ];
begin
  foreach t in array tabelas loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I;', t, t);
    execute format('create trigger trg_%I_updated_at before insert or update on public.%I for each row execute function public.set_updated_at();', t, t);
  end loop;
end;
$$;

-- ÍNDICES RECOMENDADOS PARA PERFORMANCE E SYNC (updated_at e empresa_id)
do $$
declare
  t text;
  tabelas text[] := array[
    'empresas', 'membros', 'convites', 'configs', 'insumos', 'compras', 'lista_compras', 'sabores',
    'receita_itens', 'tamanhos', 'produtos', 'producoes', 'producao_itens', 'lotes',
    'movimentos', 'canais', 'vendas', 'venda_itens', 'parceiros', 'visitas_ponto',
    'perdas', 'amostras', 'contagens', 'custos_fixos', 'rotina_tarefas',
    'tarefas_avulsas', 'checklist_itens', 'recados_mentor', 'notas_mentor',
    'configs_mentor', 'promocoes', 'zonas'
  ];
begin
  foreach t in array tabelas loop
    execute format('create index if not exists idx_%I_empresa_updated on public.%I (empresa_id, updated_at);', t, t);
  end loop;
end;
$$;

create index if not exists idx_membros_user_id on public.membros (user_id);
create index if not exists idx_convites_codigo on public.convites (codigo);

-- FUNÇÕES AUXILIARES DE RLS
create or replace function public.get_papel_usuario(p_empresa_id uuid)
returns text as $$
  select papel from public.membros
  where empresa_id = p_empresa_id
    and user_id = auth.uid()::text
    and deleted_at is null
  limit 1;
$$ language sql security definer stable;

create or replace function public.pertence_empresa(p_empresa_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.membros
    where empresa_id = p_empresa_id
      and user_id = auth.uid()::text
      and deleted_at is null
  );
$$ language sql security definer stable;

-- HABILITAR RLS EM TODAS AS TABELAS
alter table public.empresas enable row level security;
alter table public.membros enable row level security;
alter table public.convites enable row level security;
alter table public.configs enable row level security;
alter table public.insumos enable row level security;
alter table public.compras enable row level security;
alter table public.lista_compras enable row level security;
alter table public.sabores enable row level security;
alter table public.receita_itens enable row level security;
alter table public.tamanhos enable row level security;
alter table public.produtos enable row level security;
alter table public.producoes enable row level security;
alter table public.producao_itens enable row level security;
alter table public.lotes enable row level security;
alter table public.movimentos enable row level security;
alter table public.canais enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.parceiros enable row level security;
alter table public.visitas_ponto enable row level security;
alter table public.perdas enable row level security;
alter table public.amostras enable row level security;
alter table public.contagens enable row level security;
alter table public.custos_fixos enable row level security;
alter table public.rotina_tarefas enable row level security;
alter table public.tarefas_avulsas enable row level security;
alter table public.checklist_itens enable row level security;
alter table public.recados_mentor enable row level security;
alter table public.notas_mentor enable row level security;
alter table public.configs_mentor enable row level security;
alter table public.promocoes enable row level security;
alter table public.zonas enable row level security;

-- POLÍTICAS RLS: MEMBROS
drop policy if exists "membros_select" on public.membros;
drop policy if exists "membros_insert" on public.membros;
drop policy if exists "membros_update" on public.membros;

create policy "membros_select" on public.membros
for select using (
  auth.uid() is not null and (
    user_id = auth.uid()::text or pertence_empresa(empresa_id)
  )
);

create policy "membros_insert" on public.membros
for insert with check (
  auth.uid() is not null
);

create policy "membros_update" on public.membros
for update using (
  auth.uid() is not null and (
    user_id = auth.uid()::text or get_papel_usuario(empresa_id) in ('dono', 'mentor')
  )
) with check (
  auth.uid() is not null
);

-- POLÍTICAS RLS: EMPRESAS
drop policy if exists "empresas_select" on public.empresas;
drop policy if exists "empresas_insert" on public.empresas;
drop policy if exists "empresas_update" on public.empresas;

create policy "empresas_select" on public.empresas
for select using (
  auth.uid() is not null
);

create policy "empresas_insert" on public.empresas
for insert with check (
  auth.uid() is not null
);

create policy "empresas_update" on public.empresas
for update using (
  auth.uid() is not null and (
    pertence_empresa(id)
    or get_papel_usuario(id) in ('dono', 'mentor')
    or not exists (select 1 from public.membros m where m.empresa_id = empresas.id and m.deleted_at is null)
  )
) with check (
  auth.uid() is not null
);

-- POLÍTICAS RLS: ÁREA EXCLUSIVA DO MENTOR
-- notas_mentor
drop policy if exists "notas_mentor_all" on public.notas_mentor;
create policy "notas_mentor_all" on public.notas_mentor
for all using (
  get_papel_usuario(empresa_id) = 'mentor'
) with check (
  auth.uid() is not null
);

-- configs_mentor
drop policy if exists "configs_mentor_all" on public.configs_mentor;
create policy "configs_mentor_all" on public.configs_mentor
for all using (
  get_papel_usuario(empresa_id) = 'mentor'
) with check (
  auth.uid() is not null
);

-- custos_fixos: esconde itens com visibilidade = 'mentor' de quem não é mentor
drop policy if exists "custos_fixos_select" on public.custos_fixos;
drop policy if exists "custos_fixos_write" on public.custos_fixos;

create policy "custos_fixos_select" on public.custos_fixos
for select using (
  pertence_empresa(empresa_id) and (
    visibilidade = 'todos' or get_papel_usuario(empresa_id) = 'mentor'
  )
);

create policy "custos_fixos_write" on public.custos_fixos
for all using (
  (visibilidade = 'todos' and get_papel_usuario(empresa_id) in ('dono', 'mentor'))
  or
  (visibilidade = 'mentor' and get_papel_usuario(empresa_id) = 'mentor')
) with check (
  auth.uid() is not null
);

-- POLÍTICA PADRÃO PARA TODAS AS OUTRAS TABELAS OPERACIONAIS
-- Leitura permitida para quem pertence à empresa;
-- Escrita permitida se pertencer à empresa ou for usuário autenticado em onboarding.
do $$
declare
  t text;
  tabelas_padrao text[] := array[
    'convites', 'configs', 'insumos', 'compras', 'lista_compras', 'sabores', 'receita_itens',
    'tamanhos', 'produtos', 'producoes', 'producao_itens', 'lotes', 'movimentos',
    'canais', 'vendas', 'venda_itens', 'parceiros', 'visitas_ponto', 'perdas',
    'amostras', 'contagens', 'rotina_tarefas', 'tarefas_avulsas', 'checklist_itens',
    'recados_mentor', 'promocoes', 'zonas'
  ];
begin
  foreach t in array tabelas_padrao loop
    execute format('drop policy if exists "%I_select" on public.%I;', t, t);
    execute format('drop policy if exists "%I_insert" on public.%I;', t, t);
    execute format('drop policy if exists "%I_update" on public.%I;', t, t);
    execute format('drop policy if exists "%I_delete" on public.%I;', t, t);

    execute format('create policy "%I_select" on public.%I for select using (auth.uid() is not null and pertence_empresa(empresa_id));', t, t);
    execute format('create policy "%I_insert" on public.%I for insert with check (auth.uid() is not null);', t, t);
    execute format('create policy "%I_update" on public.%I for update using (auth.uid() is not null and pertence_empresa(empresa_id)) with check (auth.uid() is not null);', t, t);
    execute format('create policy "%I_delete" on public.%I for delete using (auth.uid() is not null and pertence_empresa(empresa_id) and get_papel_usuario(empresa_id) in (''dono'', ''mentor''));', t, t);
  end loop;
end;
$$;

-- FUNÇÃO RPC: aceitar_convite
create or replace function public.aceitar_convite(p_codigo text, p_nome text)
returns json as $$
declare
  v_convite record;
  v_user_id text;
  v_membro_id uuid;
  v_tem_dono boolean;
begin
  v_user_id := auth.uid()::text;
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select * into v_convite
  from public.convites
  where upper(codigo) = upper(trim(p_codigo))
    and deleted_at is null
    and usado_por is null
    and expira_em > now()
  limit 1;

  if not found then
    raise exception 'Código inválido, já usado ou vencido.';
  end if;

  if v_convite.papel = 'dono' then
    select exists (
      select 1 from public.membros
      where empresa_id = v_convite.empresa_id
        and papel = 'dono'
        and deleted_at is null
    ) into v_tem_dono;
    if v_tem_dono then
      raise exception 'A empresa já tem dono.';
    end if;
  end if;

  v_membro_id := gen_random_uuid();

  insert into public.membros (
    id, empresa_id, user_id, papel, nome, created_at, updated_at, updated_by
  ) values (
    v_membro_id, v_convite.empresa_id, v_user_id, v_convite.papel, p_nome, now(), now(), v_user_id
  );

  update public.convites
  set usado_por = p_nome,
      updated_at = now(),
      updated_by = v_user_id
  where id = v_convite.id;

  return json_build_object(
    'empresa_id', v_convite.empresa_id,
    'membro_id', v_membro_id,
    'papel', v_convite.papel,
    'user_id', v_user_id
  );
end;
$$ language plpgsql security definer;
