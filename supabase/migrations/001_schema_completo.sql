-- ════════════════════════════════════════════════════════════
-- ADBETELPE — Schema completo do banco de dados
-- Execute este arquivo no Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- ─── EXTENSÕES ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── TIPOS ENUM ──────────────────────────────────────────────
create type cargo_type as enum ('Pr', 'Ev', 'Pb', 'Dc', 'Ax', 'Ir');
create type role_type as enum ('super_admin', 'gestor_regional', 'lider_local', 'obreiro');
create type periodo_status as enum ('rascunho', 'publicado', 'fechado');
create type culto_status as enum ('agendado', 'realizado', 'cancelado');
create type presenca_status as enum ('pendente', 'confirmado', 'ausente', 'substituido');
create type disponibilidade_tipo as enum ('dia_semana', 'data_especifica', 'periodo');
create type funcao_culto as enum ('1_pregador', '2_pregador', 'suporte');

-- ════════════════════════════════════════════════════════════
-- TABELAS PERMANENTES (cadastros que existem entre períodos)
-- ════════════════════════════════════════════════════════════

-- ─── OBREIROS ────────────────────────────────────────────────
create table obreiros (
  id              uuid primary key default uuid_generate_v4(),
  nome_completo   text not null,
  cargo           cargo_type not null,
  telefone        text,
  email           text,
  foto_url        text,
  ativo           boolean not null default true,
  bloqueado       boolean not null default false,
  bloqueio_motivo text,
  bloqueio_ate    date,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index idx_obreiros_cargo on obreiros(cargo);
create index idx_obreiros_ativo on obreiros(ativo);
create index idx_obreiros_nome on obreiros(nome_completo);

-- ─── CONGREGAÇÕES ─────────────────────────────────────────────
create table congregacoes (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  endereco    text not null,
  cep         text,
  bairro      text,
  cidade      text not null default 'Olinda',
  estado      text not null default 'PE',
  lat         numeric(10,7),
  lng         numeric(10,7),
  lider_id    uuid references obreiros(id) on delete set null,
  telefone    text,
  horarios    jsonb default '[]'::jsonb,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create index idx_congregacoes_ativo on congregacoes(ativo);

-- ─── TIPOS DE CULTO ──────────────────────────────────────────
create table tipos_culto (
  id                uuid primary key default uuid_generate_v4(),
  codigo            integer not null unique,
  nome              text not null,
  restrito_cargo    boolean not null default false,
  cargos_permitidos cargo_type[] default '{}',
  ativo             boolean not null default true
);

create index idx_tipos_culto_codigo on tipos_culto(codigo);

-- ─── USUÁRIOS (vinculados ao auth.users do Supabase) ─────────
create table usuarios (
  id              uuid primary key references auth.users(id) on delete cascade,
  obreiro_id      uuid references obreiros(id) on delete set null,
  role            role_type not null default 'obreiro',
  congregacao_id  uuid references congregacoes(id) on delete set null,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

create index idx_usuarios_obreiro on usuarios(obreiro_id);
create index idx_usuarios_role on usuarios(role);

-- ════════════════════════════════════════════════════════════
-- TABELAS HISTÓRICAS (dados por período)
-- ════════════════════════════════════════════════════════════

-- ─── PERÍODOS DE ESCALA ──────────────────────────────────────
create table escala_periodos (
  id           uuid primary key default uuid_generate_v4(),
  nome         text not null,
  data_inicio  date not null,
  data_fim     date not null,
  status       periodo_status not null default 'rascunho',
  observacoes  text,
  criado_por   uuid references auth.users(id) on delete set null,
  criado_em    timestamptz not null default now(),
  constraint periodos_datas_validas check (data_fim >= data_inicio)
);

create index idx_periodos_status on escala_periodos(status);
create index idx_periodos_datas on escala_periodos(data_inicio, data_fim);

-- ─── CULTOS ──────────────────────────────────────────────────
create table cultos (
  id              uuid primary key default uuid_generate_v4(),
  periodo_id      uuid not null references escala_periodos(id) on delete cascade,
  congregacao_id  uuid not null references congregacoes(id) on delete restrict,
  tipo_culto_id   uuid not null references tipos_culto(id) on delete restrict,
  data            date not null,
  dia_semana      smallint not null generated always as (extract(dow from data)::smallint) stored,
  hora            time,
  status          culto_status not null default 'agendado',
  observacoes     text,
  criado_em       timestamptz not null default now()
);

create index idx_cultos_periodo on cultos(periodo_id);
create index idx_cultos_data on cultos(data);
create index idx_cultos_congregacao on cultos(congregacao_id);
create index idx_cultos_tipo on cultos(tipo_culto_id);
create index idx_cultos_status on cultos(status);

-- ─── CULTO_OBREIROS (quem foi escalado) ──────────────────────
create table culto_obreiros (
  id                  uuid primary key default uuid_generate_v4(),
  culto_id            uuid not null references cultos(id) on delete cascade,
  obreiro_id          uuid not null references obreiros(id) on delete restrict,
  funcao              funcao_culto not null default '1_pregador',
  presenca            presenca_status not null default 'pendente',
  justificativa_falta text,
  substituto_id       uuid references obreiros(id) on delete set null,
  registrado_em       timestamptz,
  registrado_por      uuid references auth.users(id) on delete set null,
  unique(culto_id, obreiro_id)
);

create index idx_culto_obreiros_culto on culto_obreiros(culto_id);
create index idx_culto_obreiros_obreiro on culto_obreiros(obreiro_id);
create index idx_culto_obreiros_presenca on culto_obreiros(presenca);

-- ─── DISPONIBILIDADES (por período) ──────────────────────────
create table disponibilidades (
  id                    uuid primary key default uuid_generate_v4(),
  obreiro_id            uuid not null references obreiros(id) on delete cascade,
  periodo_id            uuid not null references escala_periodos(id) on delete cascade,
  tipo                  disponibilidade_tipo not null,
  disponivel            boolean not null default true,
  dias_semana           smallint[],        -- [1,3,5] = seg, qua, sex
  data_inicio_restricao date,
  data_fim_restricao    date,
  motivo                text,
  coletado_em           timestamptz not null default now()
);

create index idx_disp_obreiro on disponibilidades(obreiro_id);
create index idx_disp_periodo on disponibilidades(periodo_id);

-- ─── NOTAS PRIVADAS ──────────────────────────────────────────
create table notas_privadas (
  id           uuid primary key default uuid_generate_v4(),
  autor_id     uuid not null references auth.users(id) on delete cascade,
  obreiro_id   uuid references obreiros(id) on delete cascade,
  culto_id     uuid references cultos(id) on delete cascade,
  conteudo     text not null,
  visivel_para role_type[] not null default '{super_admin}',
  criado_em    timestamptz not null default now()
);

create index idx_notas_obreiro on notas_privadas(obreiro_id);
create index idx_notas_culto on notas_privadas(culto_id);

-- ─── AVISOS ──────────────────────────────────────────────────
create table avisos (
  id                  uuid primary key default uuid_generate_v4(),
  titulo              text not null,
  conteudo            text not null,
  publico             boolean not null default true,
  visivel_para_roles  role_type[] default '{}',
  congregacao_id      uuid references congregacoes(id) on delete cascade,
  criado_por          uuid not null references auth.users(id) on delete cascade,
  expira_em           date,
  criado_em           timestamptz not null default now()
);

create index idx_avisos_publico on avisos(publico);
create index idx_avisos_expira on avisos(expira_em);

-- ════════════════════════════════════════════════════════════
-- FUNÇÕES E TRIGGERS
-- ════════════════════════════════════════════════════════════

-- Atualiza atualizado_em automaticamente em obreiros
create or replace function update_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_obreiros_atualizado
  before update on obreiros
  for each row execute function update_atualizado_em();

-- ─── VALIDAÇÃO: Regra Santa Ceia ─────────────────────────────
-- Bloqueia escalar obreiro de cargo incompatível em cultos restritos
create or replace function validar_cargo_culto()
returns trigger language plpgsql as $$
declare
  v_restrito      boolean;
  v_cargos        cargo_type[];
  v_cargo_obreiro cargo_type;
begin
  -- Busca tipo do culto
  select tc.restrito_cargo, tc.cargos_permitidos
  into v_restrito, v_cargos
  from cultos c
  join tipos_culto tc on tc.id = c.tipo_culto_id
  where c.id = new.culto_id;

  -- Busca cargo do obreiro
  select cargo into v_cargo_obreiro
  from obreiros where id = new.obreiro_id;

  -- Valida restrição
  if v_restrito and not (v_cargo_obreiro = any(v_cargos)) then
    raise exception 'Este tipo de culto exige cargo: %. O obreiro tem cargo: %',
      array_to_string(v_cargos, ', '), v_cargo_obreiro;
  end if;

  return new;
end;
$$;

create trigger trg_validar_cargo_culto
  before insert or update on culto_obreiros
  for each row execute function validar_cargo_culto();

-- ─── VALIDAÇÃO: Proibição de dupla escala no mesmo dia ───────
create or replace function validar_dupla_escala()
returns trigger language plpgsql as $$
declare
  v_data_culto    date;
  v_congregacao   text;
  v_conflito      record;
begin
  -- Data do culto atual
  select c.data, cong.nome
  into v_data_culto, v_congregacao
  from cultos c
  join congregacoes cong on cong.id = c.congregacao_id
  where c.id = new.culto_id;

  -- Verifica se obreiro já está escalado em outro culto no mesmo dia
  select co.id, cong2.nome as outra_congregacao
  into v_conflito
  from culto_obreiros co
  join cultos c2 on c2.id = co.culto_id
  join congregacoes cong2 on cong2.id = c2.congregacao_id
  where co.obreiro_id = new.obreiro_id
    and c2.data = v_data_culto
    and co.culto_id != new.culto_id
  limit 1;

  if found then
    raise exception 'Conflito de escala: este obreiro já está escalado em "%" no dia %. Não é permitido escalar a mesma pessoa duas vezes no mesmo dia.',
      v_conflito.outra_congregacao,
      to_char(v_data_culto, 'DD/MM/YYYY');
  end if;

  return new;
end;
$$;

create trigger trg_validar_dupla_escala
  before insert on culto_obreiros
  for each row execute function validar_dupla_escala();

-- ════════════════════════════════════════════════════════════
-- VIEW: HISTÓRICO E RANKING
-- ════════════════════════════════════════════════════════════

create or replace view vw_ranking_obreiros as
select
  o.id                                                      as obreiro_id,
  o.nome_completo,
  o.cargo,
  ep.id                                                     as periodo_id,
  ep.nome                                                   as periodo_nome,
  ep.data_inicio,
  ep.data_fim,
  count(co.id)                                              as total_escalas,
  count(co.id) filter (where co.presenca = 'confirmado')    as total_presencas,
  count(co.id) filter (where co.presenca = 'ausente')       as total_faltas,
  count(co.id) filter (where co.presenca = 'pendente')      as total_pendentes,
  round(
    case when count(co.id) > 0
      then (count(co.id) filter (where co.presenca = 'confirmado'))::numeric
           / count(co.id) * 100
      else 0
    end, 1
  )                                                         as percentual_assiduidade
from obreiros o
join culto_obreiros co on co.obreiro_id = o.id
join cultos c on c.id = co.culto_id
join escala_periodos ep on ep.id = c.periodo_id
group by o.id, o.nome_completo, o.cargo, ep.id, ep.nome, ep.data_inicio, ep.data_fim;

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════

alter table obreiros          enable row level security;
alter table congregacoes      enable row level security;
alter table tipos_culto       enable row level security;
alter table usuarios          enable row level security;
alter table escala_periodos   enable row level security;
alter table cultos            enable row level security;
alter table culto_obreiros    enable row level security;
alter table disponibilidades  enable row level security;
alter table notas_privadas    enable row level security;
alter table avisos            enable row level security;

-- Helper: retorna role do usuário logado
create or replace function get_user_role()
returns role_type language sql security definer as $$
  select role from usuarios where id = auth.uid()
$$;

-- Helper: retorna se é admin ou gestor
create or replace function is_gestor()
returns boolean language sql security definer as $$
  select get_user_role() in ('super_admin', 'gestor_regional')
$$;

-- ─── POLICIES: obreiros ───────────────────────────────────────
create policy "todos_veem_obreiros_ativos"
  on obreiros for select
  using (auth.uid() is not null and ativo = true);

create policy "gestores_veem_todos_obreiros"
  on obreiros for select
  using (is_gestor());

create policy "gestores_gerenciam_obreiros"
  on obreiros for all
  using (is_gestor());

-- ─── POLICIES: congregações ────────────────────────────────
create policy "todos_veem_congregacoes"
  on congregacoes for select
  using (auth.uid() is not null);

create policy "gestores_gerenciam_congregacoes"
  on congregacoes for all
  using (is_gestor());

-- ─── POLICIES: tipos_culto ────────────────────────────────
create policy "todos_veem_tipos_culto"
  on tipos_culto for select
  using (auth.uid() is not null);

create policy "admins_gerenciam_tipos"
  on tipos_culto for all
  using (get_user_role() = 'super_admin');

-- ─── POLICIES: usuarios ───────────────────────────────────
create policy "usuario_ve_proprio_perfil"
  on usuarios for select
  using (id = auth.uid());

create policy "admins_veem_todos_usuarios"
  on usuarios for select
  using (get_user_role() = 'super_admin');

create policy "admins_gerenciam_usuarios"
  on usuarios for all
  using (get_user_role() = 'super_admin');

-- ─── POLICIES: escala_periodos ────────────────────────────
create policy "todos_veem_periodos_publicados"
  on escala_periodos for select
  using (auth.uid() is not null and status in ('publicado', 'fechado'));

create policy "gestores_veem_todos_periodos"
  on escala_periodos for select
  using (is_gestor());

create policy "gestores_gerenciam_periodos"
  on escala_periodos for all
  using (is_gestor());

-- ─── POLICIES: cultos ─────────────────────────────────────
create policy "todos_veem_cultos"
  on cultos for select
  using (auth.uid() is not null);

create policy "gestores_e_lideres_gerenciam_cultos"
  on cultos for all
  using (get_user_role() in ('super_admin', 'gestor_regional', 'lider_local'));

-- ─── POLICIES: culto_obreiros ─────────────────────────────
create policy "todos_veem_escalas"
  on culto_obreiros for select
  using (auth.uid() is not null);

create policy "gestores_gerenciam_escalas"
  on culto_obreiros for all
  using (get_user_role() in ('super_admin', 'gestor_regional', 'lider_local'));

create policy "obreiro_confirma_propria_presenca"
  on culto_obreiros for update
  using (
    obreiro_id = (select obreiro_id from usuarios where id = auth.uid())
  );

-- ─── POLICIES: disponibilidades ───────────────────────────
create policy "obreiro_ve_propria_disponibilidade"
  on disponibilidades for select
  using (
    obreiro_id = (select obreiro_id from usuarios where id = auth.uid())
    or is_gestor()
  );

create policy "obreiro_gerencia_propria_disponibilidade"
  on disponibilidades for all
  using (
    obreiro_id = (select obreiro_id from usuarios where id = auth.uid())
    or is_gestor()
  );

-- ─── POLICIES: notas_privadas ─────────────────────────────
create policy "notas_visiveis_por_role"
  on notas_privadas for select
  using (
    get_user_role() = any(visivel_para)
    or autor_id = auth.uid()
  );

create policy "gestores_criam_notas"
  on notas_privadas for insert
  with check (is_gestor() and autor_id = auth.uid());

create policy "autor_gerencia_nota"
  on notas_privadas for all
  using (autor_id = auth.uid());

-- ─── POLICIES: avisos ─────────────────────────────────────
create policy "todos_veem_avisos_publicos"
  on avisos for select
  using (
    auth.uid() is not null
    and (
      publico = true
      or get_user_role() = any(visivel_para_roles)
      or is_gestor()
    )
    and (expira_em is null or expira_em >= current_date)
  );

create policy "gestores_gerenciam_avisos"
  on avisos for all
  using (is_gestor());

-- ════════════════════════════════════════════════════════════
-- SEED: DADOS INICIAIS
-- ════════════════════════════════════════════════════════════

-- Tipos de culto (baseado na planilha ADBETELPE)
insert into tipos_culto (codigo, nome, restrito_cargo, cargos_permitidos) values
  (1,  '01. Doutrina',                      false, '{}'),
  (2,  '02. Evangelístico',                 false, '{}'),
  (3,  '03. Santa Ceia',                    true,  array['Pr','Ev','Pb']::cargo_type[]),
  (4,  '04. Chá para Mulheres',             false, '{}'),
  (5,  '05. Círculo de Oração',             false, '{}'),
  (6,  '06. Missões',                       false, '{}'),
  (7,  '07. Casais',                        false, '{}'),
  (8,  '08. DEV - Homens',                  false, '{}'),
  (9,  '09. DEF - Mulheres',                false, '{}'),
  (10, '10. Aniv. do Templo',               false, '{}'),
  (11, '11. Aniv. de Círculo de Oração',    false, '{}'),
  (12, '12. Aniv. dos Heróis da Fé',        false, '{}'),
  (13, '13. Aniv. do M.Q.V',               false, '{}'),
  (14, '14. Aniv. do Semearte',             false, '{}'),
  (15, '15. Aniv. do Vocal',               false, '{}'),
  (16, '16. Aniv. da UMADEBE',             false, '{}'),
  (17, '17. Natalino',                      false, '{}'),
  (18, '18. Vigília - Passagem de Ano',     false, '{}'),
  (19, '19. Congresso Infantil',            false, '{}'),
  (20, '20. Congresso Adolescentes',        false, '{}'),
  (21, '21. Congresso de Jovens',           false, '{}'),
  (22, '22. Conferência de Mulheres',       false, '{}'),
  (23, '23. Conferência de Homens',         false, '{}'),
  (24, '24. Congresso de Missões',          false, '{}'),
  (25, '25. Cruzada Evangelística',         false, '{}'),
  (26, '26. Formatura do Discipulado',      false, '{}'),
  (27, '27. Ação de Graças',               false, '{}'),
  (28, '28. Seminário para Casais',         false, '{}'),
  (29, '29. Aniv. Ministério ADBETELPE',   false, '{}'),
  (30, '30. Déboras',                       false, '{}'),
  (31, '31. Ponto de Pregação',             false, '{}');

-- Congregações (baseado na planilha ADBETELPE)
insert into congregacoes (nome, endereco, bairro, cidade, estado) values
  ('Sede',              'Rua Ns. da Conceição, 37-185',  'Tabajara',        'Olinda',      'PE'),
  ('Alto Nova Olinda',  'Alto Nova Olinda',               'Alto Nova Olinda','Olinda',      'PE'),
  ('Abreu e Lima',      'Abreu e Lima',                   'Abreu e Lima',    'Abreu e Lima','PE'),
  ('Caetés 1',          'Caetés',                         'Caetés',          'Abreu e Lima','PE'),
  ('Janga',             'Janga',                          'Janga',           'Paulista',    'PE'),
  ('Jaguarana',         'Jaguarana',                      'Jaguarana',       'Olinda',      'PE'),
  ('Tabajara',          'Tabajara',                       'Tabajara',        'Olinda',      'PE'),
  ('Rio Doce',          'Rio Doce',                       'Rio Doce',        'Olinda',      'PE'),
  ('Rua Georgia',       'Rua Georgia',                    'Paulista',        'Paulista',    'PE'),
  ('Rua Newton Torres', 'Rua Newton Torres',              'Paulista Nobre',  'Paulista',    'PE');

-- Obreiros (baseado na planilha ADBETELPE)
insert into obreiros (nome_completo, cargo) values
  -- Pastores
  ('André Barbosa',       'Pr'),
  ('Saulo Rogério',       'Pr'),
  ('Amaro Flávio',        'Pr'),
  ('Erivaldo Lins',       'Pr'),
  ('Flávio Henrique',     'Pr'),
  ('Jamel Davi',          'Pr'),
  ('Manoel Rodrigues',    'Pr'),
  ('Marcos Moraes',       'Pr'),
  ('Noberto Deschamps',   'Pr'),
  ('Rodrigo César',       'Pr'),
  ('Filipe Rogério',      'Pr'),
  ('Sergio Lima',         'Pr'),
  ('Maginiele Artur',     'Pr'),
  -- Evangelistas
  ('Adriano Souza',       'Ev'),
  ('Filipe Rogério',      'Ev'),
  ('Ivaldy Ferreira',     'Ev'),
  ('Leonard Ribeiro',     'Ev'),
  ('Lucenildo Marques',   'Ev'),
  ('Maginiele Artur',     'Ev'),
  ('Marcio Araújo',       'Ev'),
  ('Phelipe Anselmo',     'Ev'),
  ('Sergio Lima',         'Ev'),
  ('Vlademir Gomes',      'Ev'),
  -- Presbíteros
  ('Charles Araújo',      'Pb'),
  ('Elexsandro Ferreira', 'Pb'),
  ('Erico Pereira',       'Pb'),
  ('Fillip Valentim',     'Pb'),
  ('Gilson Manoel',       'Pb'),
  ('João Macário',        'Pb'),
  ('Joelmo Victor',       'Pb'),
  ('Marcos Antônio',      'Pb'),
  ('Manoel Miguel',       'Pb'),
  ('Marcio Gleybson',     'Pb'),
  ('Raphael Henrique',    'Pb'),
  ('Rodolfo César',       'Pb'),
  ('Victor Hugo',         'Pb'),
  -- Diáconos
  ('Antony Augusto',      'Dc'),
  ('Ebenézer Ferreira',   'Dc'),
  ('Elias Valentim',      'Dc'),
  ('Fabio Leandro',       'Dc'),
  ('Gilmar Antônio',      'Dc'),
  ('Givaldo Pereira',     'Dc'),
  ('Jose Renato',         'Dc'),
  ('Lucas Lucena',        'Dc'),
  ('Michael Mendonça',    'Dc'),
  ('Pedro Henrique',      'Dc'),
  ('Thiago Rodrigues',    'Dc'),
  ('Rafael Marcelino',    'Dc'),
  ('Romário Pereira',     'Dc'),
  ('Silvio Ramos',        'Dc'),
  ('Willames Medeiros',   'Dc'),
  ('William Rogers',      'Dc'),
  -- Auxiliares
  ('Alan Kardek',         'Ax'),
  ('Aldeclin Santos',     'Ax'),
  ('Brainer Neves',       'Ax'),
  ('Cristian Melo',       'Ax'),
  ('Fabio Bonifácio',     'Ax'),
  ('Fábio Ribeiro',       'Ax'),
  ('Genilson Barbosa',    'Ax'),
  ('Gustavo Alexandre',   'Ax'),
  ('Jean Carlos',         'Ax'),
  ('Jesonias Raimundo',   'Ax'),
  ('João Avelino',        'Ax'),
  ('João Mota',           'Ax'),
  ('João Tavares',        'Ax'),
  ('Josafá Santos',       'Ax'),
  ('José Airton',         'Ax'),
  ('José Carlos',         'Ax'),
  ('Leonardo Wallacy',    'Ax'),
  ('Luciano Freire',      'Ax'),
  ('Luciano Luiz',        'Ax'),
  ('Marcos Carvalho',     'Ax'),
  ('Marcos Celerino',     'Ax'),
  ('Pabulo Tavares',      'Ax'),
  ('Pedro Daniel',        'Ax'),
  ('Rafael Barbosa',      'Ax'),
  ('Roberto Souza',       'Ax'),
  ('Rogeson Ferreira',    'Ax'),
  ('Thiago Senna',        'Ax'),
  ('Vinicius Aguiar',     'Ax'),
  -- Mulheres (Irmãs)
  ('Adna Lima',           'Ir'),
  ('Essi Paula',          'Ir'),
  ('Flávia Cibele',       'Ir'),
  ('Gleyciane Gomes',     'Ir'),
  ('Hadassa Camilly',     'Ir'),
  ('Kassia Almeida',      'Ir'),
  ('Letícia Barbosa',     'Ir'),
  ('Meire Oliveira',      'Ir'),
  ('Paula Karine',        'Ir'),
  ('Tânia Katiucha',      'Ir');
