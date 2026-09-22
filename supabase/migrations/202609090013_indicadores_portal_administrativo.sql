-- Agenda 24h V2 — migration 013: indicadores do portal administrativo
--
-- A função desta migration entrega somente dados agregados para o painel do
-- administrador. Ela não retorna nomes, telefones, conteúdo de mensagens ou
-- outras informações pessoais dos clientes.

create index if not exists idx_agendamentos_empresa_criado_em
  on public.agendamentos (empresa_id, criado_em);

create index if not exists idx_agendamentos_empresa_inicio_status
  on public.agendamentos (empresa_id, inicio_em, status);

create index if not exists idx_agendamentos_empresa_cliente_criado_em
  on public.agendamentos (empresa_id, cliente_id, criado_em);

create index if not exists idx_fila_mensagens_empresa_estado_programado
  on public.fila_mensagens (empresa_id, estado, programado_para);

create index if not exists idx_fila_mensagens_empresa_tipo_enviado
  on public.fila_mensagens (empresa_id, tipo, enviado_em)
  where estado = 'enviado';

create index if not exists idx_mensagens_empresa_direcao_origem_recebida
  on public.mensagens (empresa_id, direcao, origem, recebida_em);

create or replace function public.consultar_indicadores_portal(
  p_empresa_id uuid,
  p_inicio date default (current_date - 29),
  p_fim date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fuso_horario text;
  v_inicio timestamptz;
  v_fim_exclusivo timestamptz;
begin
  if p_empresa_id is null or p_inicio is null or p_fim is null then
    raise exception 'Empresa e período são obrigatórios';
  end if;

  if p_fim < p_inicio then
    raise exception 'A data final não pode ser anterior à data inicial';
  end if;

  if p_fim - p_inicio > 365 then
    raise exception 'O período máximo de consulta é de 366 dias';
  end if;

  select e.fuso_horario
  into v_fuso_horario
  from public.empresas e
  where e.id = p_empresa_id;

  if not found then
    raise exception 'Empresa não encontrada';
  end if;

  if not (
    public.eh_administrador_empresa(p_empresa_id)
    or public.eh_operador_plataforma()
  ) then
    raise exception 'Sem permissão para consultar os indicadores desta empresa';
  end if;

  -- O filtro segue o fuso configurado pela empresa, e não o fuso do navegador.
  v_inicio := p_inicio::timestamp at time zone v_fuso_horario;
  v_fim_exclusivo := (p_fim + 1)::timestamp at time zone v_fuso_horario;

  return (
    with
    agendamentos_criados as (
      select a.*
      from public.agendamentos a
      where a.empresa_id = p_empresa_id
        and a.criado_em >= v_inicio
        and a.criado_em < v_fim_exclusivo
    ),
    agendamentos_no_periodo as (
      select a.*
      from public.agendamentos a
      where a.empresa_id = p_empresa_id
        and a.inicio_em >= v_inicio
        and a.inicio_em < v_fim_exclusivo
    ),
    lembretes_enviados as (
      select f.*
      from public.fila_mensagens f
      where f.empresa_id = p_empresa_id
        and f.tipo in ('lembrete_24h', 'lembrete_2h')
        and f.estado = 'enviado'
        and f.enviado_em >= v_inicio
        and f.enviado_em < v_fim_exclusivo
    ),
    reativacoes_enviadas as (
      select f.*
      from public.fila_mensagens f
      where f.empresa_id = p_empresa_id
        and f.tipo = 'reativacao'
        and f.estado = 'enviado'
        and f.enviado_em >= v_inicio
        and f.enviado_em < v_fim_exclusivo
    ),
    reativacoes_convertidas as (
      select r.id
      from reativacoes_enviadas r
      where exists (
        select 1
        from public.agendamentos a
        where a.empresa_id = p_empresa_id
          and a.cliente_id = r.cliente_id
          and a.criado_em >= r.enviado_em
          and a.criado_em < r.enviado_em + interval '90 days'
          and a.status in ('confirmado', 'concluido')
      )
    ),
    agenda_por_dia as (
      select
        (a.criado_em at time zone v_fuso_horario)::date as data,
        count(*)::integer as agendamentos_criados,
        count(distinct a.cliente_id)::integer as clientes_agendaram
      from agendamentos_criados a
      group by 1
    ),
    lembretes_por_dia as (
      select
        (l.enviado_em at time zone v_fuso_horario)::date as data,
        count(*)::integer as lembretes_enviados
      from lembretes_enviados l
      group by 1
    ),
    reativacoes_por_dia as (
      select
        (r.enviado_em at time zone v_fuso_horario)::date as data,
        count(*)::integer as reativacoes_enviadas,
        count(rc.id)::integer as reativacoes_convertidas
      from reativacoes_enviadas r
      left join reativacoes_convertidas rc on rc.id = r.id
      group by 1
    ),
    serie_diaria as (
      select
        d.data,
        coalesce(a.agendamentos_criados, 0) as agendamentos_criados,
        coalesce(a.clientes_agendaram, 0) as clientes_agendaram,
        coalesce(l.lembretes_enviados, 0) as lembretes_enviados,
        coalesce(r.reativacoes_enviadas, 0) as reativacoes_enviadas,
        coalesce(r.reativacoes_convertidas, 0) as reativacoes_convertidas
      from generate_series(p_inicio, p_fim, interval '1 day') as d(data)
      left join agenda_por_dia a on a.data = d.data::date
      left join lembretes_por_dia l on l.data = d.data::date
      left join reativacoes_por_dia r on r.data = d.data::date
    )
    select jsonb_build_object(
      'periodo', jsonb_build_object(
        'inicio', p_inicio,
        'fim', p_fim,
        'fuso_horario', v_fuso_horario
      ),
      'agenda', jsonb_build_object(
        'agendamentos_criados', (select count(*) from agendamentos_criados),
        'clientes_agendaram', (select count(distinct cliente_id) from agendamentos_criados),
        'agendamentos_whatsapp', (
          select count(*) from agendamentos_criados where origem = 'cliente_whatsapp'
        ),
        'concluidos', (
          select count(*) from agendamentos_no_periodo where status = 'concluido'
        ),
        'faltas', (
          select count(*) from agendamentos_no_periodo where status = 'faltou'
        ),
        'cancelados', (
          select count(*)
          from public.agendamentos a
          where a.empresa_id = p_empresa_id
            and a.status = 'cancelado'
            and coalesce(a.cancelado_em, a.atualizado_em) >= v_inicio
            and coalesce(a.cancelado_em, a.atualizado_em) < v_fim_exclusivo
        ),
        'taxa_comparecimento', coalesce((
          select round(
            100.0 * count(*) filter (where status = 'concluido')
            / nullif(count(*) filter (where status in ('concluido', 'faltou')), 0),
            1
          )
          from agendamentos_no_periodo
        ), 0)
      ),
      'automacoes', jsonb_build_object(
        'lembretes_enviados', (select count(*) from lembretes_enviados),
        'reativacoes_enviadas', (select count(*) from reativacoes_enviadas),
        'reativacoes_convertidas', (select count(*) from reativacoes_convertidas),
        'taxa_conversao_reativacao', coalesce((
          select round(100.0 * count(*) / nullif((select count(*) from reativacoes_enviadas), 0), 1)
          from reativacoes_convertidas
        ), 0),
        'conversas_iniciadas', (
          select count(*)
          from public.conversas c
          where c.empresa_id = p_empresa_id
            and c.criado_em >= v_inicio
            and c.criado_em < v_fim_exclusivo
        ),
        'mensagens_recebidas', (
          select count(*)
          from public.mensagens m
          where m.empresa_id = p_empresa_id
            and m.direcao = 'entrada'
            and m.recebida_em >= v_inicio
            and m.recebida_em < v_fim_exclusivo
        )
      ),
      'saude_automacao', jsonb_build_object(
        'pendentes', (
          select count(*) from public.fila_mensagens f
          where f.empresa_id = p_empresa_id and f.estado = 'pendente'
        ),
        'processando', (
          select count(*) from public.fila_mensagens f
          where f.empresa_id = p_empresa_id and f.estado = 'processando'
        ),
        'falhas_ativas', (
          select count(*) from public.fila_mensagens f
          where f.empresa_id = p_empresa_id and f.estado = 'falhou'
        ),
        'proxima_automacao_em', (
          select min(f.programado_para) from public.fila_mensagens f
          where f.empresa_id = p_empresa_id and f.estado = 'pendente'
        )
      ),
      'serie_diaria', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'data', sd.data::date,
            'agendamentos_criados', sd.agendamentos_criados,
            'clientes_agendaram', sd.clientes_agendaram,
            'lembretes_enviados', sd.lembretes_enviados,
            'reativacoes_enviadas', sd.reativacoes_enviadas,
            'reativacoes_convertidas', sd.reativacoes_convertidas
          ) order by sd.data
        )
        from serie_diaria sd
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.consultar_indicadores_portal(uuid, date, date) from public, anon;
grant execute on function public.consultar_indicadores_portal(uuid, date, date) to authenticated;

comment on function public.consultar_indicadores_portal(uuid, date, date) is
  'Resumo agregado e autorizado do portal administrativo. Reativação convertida = novo agendamento confirmado ou concluído até 90 dias depois do envio.';
