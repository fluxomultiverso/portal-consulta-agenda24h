-- Agenda 24h V2 — contratos de leitura para o portal
-- Usa somente dados existentes e deriva empresa/papel a partir de auth.uid().

create or replace function public.obter_contexto_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_resultado jsonb;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  select jsonb_build_object(
    'usuario_id', m.usuario_id,
    'nome_exibicao', m.nome_exibicao,
    'papel_acesso', m.papel_acesso,
    'empresa_id', e.id,
    'empresa_nome', e.nome_fantasia,
    'profissional_id', m.profissional_id
  )
  into v_resultado
  from public.membros_empresa m
  join public.empresas e on e.id = m.empresa_id
  where m.usuario_id = auth.uid()
    and m.ativo
    and e.status_operacional in ('em_validacao', 'ativo')
  order by m.criado_em
  limit 1;

  if v_resultado is null then
    raise exception 'Vínculo ativo com uma empresa não encontrado';
  end if;
  return v_resultado;
end;
$$;

create or replace function public.consultar_profissionais_portal()
returns table (id uuid, nome text, cor_agenda text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, p.cor_agenda
  from public.membros_empresa m
  join public.profissionais p on p.empresa_id = m.empresa_id
  where m.usuario_id = auth.uid()
    and m.ativo
    and p.ativo
    and (m.papel_acesso = 'administrador' or p.id = m.profissional_id)
  order by p.nome;
$$;

create or replace function public.consultar_agenda_portal(
  p_data date,
  p_profissional_id uuid default null
)
returns table (
  id uuid,
  cliente_id uuid,
  profissional_id uuid,
  servico_id uuid,
  cliente_nome text,
  profissional_nome text,
  servico_nome text,
  inicio_em timestamptz,
  duracao_min smallint,
  preco numeric,
  status text,
  origem text,
  observacoes_cliente text,
  concluido_em timestamptz,
  faltou_em timestamptz,
  atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_membro public.membros_empresa%rowtype;
  v_fuso text;
  v_inicio timestamptz;
  v_fim timestamptz;
begin
  if p_data is null then raise exception 'Data obrigatória'; end if;
  select * into v_membro from public.membros_empresa
  where usuario_id = auth.uid() and ativo order by criado_em limit 1;
  if not found then raise exception 'Vínculo ativo não encontrado'; end if;
  select e.fuso_horario into v_fuso
  from public.empresas e
  where e.id = v_membro.empresa_id;
  v_inicio := p_data::timestamp at time zone v_fuso;
  v_fim := (p_data + 1)::timestamp at time zone v_fuso;

  return query
  select a.id, a.cliente_id, a.profissional_id, a.servico_id,
    coalesce(c.nome, 'Cliente sem nome'), p.nome, s.nome, a.inicio_em,
    a.duracao_min, a.preco, a.status::text, a.origem::text,
    a.observacoes_cliente, a.concluido_em, a.faltou_em, a.atualizado_em
  from public.agendamentos a
  join public.clientes c on c.id = a.cliente_id and c.empresa_id = a.empresa_id
  join public.profissionais p on p.id = a.profissional_id and p.empresa_id = a.empresa_id
  join public.servicos s on s.id = a.servico_id and s.empresa_id = a.empresa_id
  where a.empresa_id = v_membro.empresa_id
    and a.inicio_em >= v_inicio and a.inicio_em < v_fim
    and (v_membro.papel_acesso = 'administrador' or a.profissional_id = v_membro.profissional_id)
    and (p_profissional_id is null or a.profissional_id = p_profissional_id)
  order by a.inicio_em;
end;
$$;

create or replace function public.consultar_atendimento_portal(p_agendamento_id uuid)
returns table (
  id uuid, cliente_id uuid, profissional_id uuid, servico_id uuid,
  cliente_nome text, profissional_nome text, servico_nome text,
  inicio_em timestamptz, duracao_min smallint, preco numeric,
  status text, origem text, observacoes_cliente text,
  concluido_em timestamptz, faltou_em timestamptz, atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_membro public.membros_empresa%rowtype;
begin
  select * into v_membro from public.membros_empresa
  where usuario_id = auth.uid() and ativo order by criado_em limit 1;
  if not found then raise exception 'Vínculo ativo não encontrado'; end if;

  return query
  select a.id, a.cliente_id, a.profissional_id, a.servico_id,
    coalesce(c.nome, 'Cliente sem nome'), p.nome, s.nome, a.inicio_em,
    a.duracao_min, a.preco, a.status::text, a.origem::text,
    a.observacoes_cliente, a.concluido_em, a.faltou_em, a.atualizado_em
  from public.agendamentos a
  join public.clientes c on c.id = a.cliente_id and c.empresa_id = a.empresa_id
  join public.profissionais p on p.id = a.profissional_id and p.empresa_id = a.empresa_id
  join public.servicos s on s.id = a.servico_id and s.empresa_id = a.empresa_id
  where a.id = p_agendamento_id
    and a.empresa_id = v_membro.empresa_id
    and (v_membro.papel_acesso = 'administrador' or a.profissional_id = v_membro.profissional_id);
end;
$$;

create or replace function public.consultar_automacoes_portal()
returns table (
  tipo text, nome text, status text, ultima_execucao timestamptz,
  proxima_execucao timestamptz, quantidade_itens bigint, descricao text
)
language sql
stable
security definer
set search_path = public
as $$
  with membro as (
    select empresa_id, papel_acesso from public.membros_empresa
    where usuario_id = auth.uid() and ativo order by criado_em limit 1
  ), tipos(tipo, nome, descricao) as (values
    ('lembrete_24h', 'Lembrete de 24 horas', 'Lembretes programados para o dia anterior.'),
    ('lembrete_2h', 'Lembrete de 2 horas', 'Lembretes próximos do atendimento.'),
    ('reativacao', 'Reativação de clientes', 'Mensagens de retorno programadas.'),
    ('retomada_ia', 'Retomada do atendimento', 'Retomadas automáticas de conversa.')
  ), resumo as (
    select f.tipo::text as tipo,
      case
        when count(*) filter (where f.estado = 'falhou') > 0 then 'falha'
        when count(*) filter (where f.estado = 'processando') > 0 then 'processando'
        when count(*) filter (where f.estado = 'pendente') > 0 then 'pendente'
        else 'concluida'
      end as status,
      max(f.enviado_em) as ultima_execucao,
      min(f.programado_para) filter (where f.estado = 'pendente') as proxima_execucao,
      count(*) filter (where f.estado in ('pendente', 'processando', 'falhou')) as quantidade_itens
    from public.fila_mensagens f, membro m
    where f.empresa_id = m.empresa_id and m.papel_acesso = 'administrador'
    group by f.tipo
  )
  select t.tipo, t.nome, coalesce(r.status, 'concluida'), r.ultima_execucao,
    r.proxima_execucao, coalesce(r.quantidade_itens, 0), t.descricao
  from tipos t left join resumo r using (tipo)
  where exists (select 1 from membro where papel_acesso = 'administrador')
  order by t.tipo;
$$;

create or replace function public.consultar_relatorios_portal()
returns setof public.relatorios_semanais_empresa
language sql
stable
security definer
set search_path = public
as $$
  select r.* from public.relatorios_semanais_empresa r
  join public.membros_empresa m on m.empresa_id = r.empresa_id
  where m.usuario_id = auth.uid() and m.ativo and m.papel_acesso = 'administrador'
  order by r.semana_inicio desc;
$$;

create or replace function public.consultar_gestao_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_resultado jsonb;
begin
  select jsonb_build_object(
    'id', e.id,
    'codigo', e.codigo,
    'nomeFantasia', e.nome_fantasia,
    'admin', jsonb_build_object('nome', m.nome_exibicao, 'email', coalesce(auth.jwt()->>'email', '')),
    'plano', jsonb_build_object(
      'codigo', pl.codigo, 'nome', pl.nome,
      'capacidadeProfissionais', a.limite_profissionais_contratado
    ),
    'profissionais', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nome', p.nome, 'email', p.email, 'telefone', p.telefone,
        'ativo', p.ativo, 'acessoPortal', exists (
          select 1 from public.membros_empresa mp
          where mp.empresa_id = p.empresa_id and mp.profissional_id = p.id and mp.ativo
        ),
        'corAgenda', p.cor_agenda,
        'servicoIds', coalesce((select jsonb_agg(ps.servico_id) from public.profissional_servicos ps where ps.profissional_id = p.id and ps.empresa_id = p.empresa_id and ps.ativo), '[]'::jsonb),
        'horarios', coalesce((select jsonb_agg(jsonb_build_object('diaSemana', h.dia_semana, 'horaInicio', h.inicio, 'horaFim', h.fim, 'ativo', h.ativo)) from public.horarios_profissionais h where h.profissional_id = p.id and h.empresa_id = p.empresa_id and h.ativo), '[]'::jsonb),
        'criadoEm', p.criado_em, 'atualizadoEm', p.atualizado_em
      ) order by p.nome) from public.profissionais p where p.empresa_id = e.id
    ), '[]'::jsonb),
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'nome', s.nome, 'descricao', s.descricao,
        'duracaoMinutos', s.duracao_min, 'preco', s.preco,
        'prazoReativacaoDias', s.prazo_reativacao_dias,
        'requerAvaliacao', s.requer_avaliacao, 'ordemExibicao', s.ordem_exibicao,
        'ativo', s.ativo, 'criadoEm', s.criado_em
      ) order by s.ordem_exibicao, s.nome) from public.servicos s where s.empresa_id = e.id
    ), '[]'::jsonb)
  ) into v_resultado
  from public.membros_empresa m
  join public.empresas e on e.id = m.empresa_id
  join public.assinaturas a on a.empresa_id = e.id
  join public.planos pl on pl.id = a.plano_id
  where m.usuario_id = auth.uid() and m.ativo and m.papel_acesso = 'administrador'
  order by m.criado_em limit 1;

  if v_resultado is null then raise exception 'Acesso administrativo não autorizado'; end if;
  return v_resultado;
end;
$$;

revoke all on function public.obter_contexto_portal() from public, anon;
revoke all on function public.consultar_profissionais_portal() from public, anon;
revoke all on function public.consultar_agenda_portal(date, uuid) from public, anon;
revoke all on function public.consultar_atendimento_portal(uuid) from public, anon;
revoke all on function public.consultar_automacoes_portal() from public, anon;
revoke all on function public.consultar_relatorios_portal() from public, anon;
revoke all on function public.consultar_gestao_portal() from public, anon;

grant execute on function public.obter_contexto_portal() to authenticated;
grant execute on function public.consultar_profissionais_portal() to authenticated;
grant execute on function public.consultar_agenda_portal(date, uuid) to authenticated;
grant execute on function public.consultar_atendimento_portal(uuid) to authenticated;
grant execute on function public.consultar_automacoes_portal() to authenticated;
grant execute on function public.consultar_relatorios_portal() to authenticated;
grant execute on function public.consultar_gestao_portal() to authenticated;
