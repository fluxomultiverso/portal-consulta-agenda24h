-- Agenda 24h V2 — migration 014: relatório semanal exclusivo do administrador
--
-- O relatório é um retrato semanal persistido. Assim, mudanças futuras de
-- plano/preço não alteram a referência de custo exibida em semanas já fechadas.

create table public.relatorios_semanais_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  semana_inicio date not null,
  semana_fim date not null,
  fuso_horario text not null,
  custo_mensal_referencia numeric(12,2) check (custo_mensal_referencia >= 0),
  agendamentos_criados integer not null default 0 check (agendamentos_criados >= 0),
  clientes_agendaram integer not null default 0 check (clientes_agendaram >= 0),
  agendamentos_whatsapp integer not null default 0 check (agendamentos_whatsapp >= 0),
  atendimentos_concluidos integer not null default 0 check (atendimentos_concluidos >= 0),
  faltas integer not null default 0 check (faltas >= 0),
  faturamento_agendamentos numeric(12,2) not null default 0 check (faturamento_agendamentos >= 0),
  lembretes_enviados integer not null default 0 check (lembretes_enviados >= 0),
  conversas_iniciadas integer not null default 0 check (conversas_iniciadas >= 0),
  mensagens_recebidas integer not null default 0 check (mensagens_recebidas >= 0),
  reativacoes_enviadas integer not null default 0 check (reativacoes_enviadas >= 0),
  reativacoes_convertidas integer not null default 0 check (reativacoes_convertidas >= 0),
  faturamento_reativacoes numeric(12,2) not null default 0 check (faturamento_reativacoes >= 0),
  cobertura_mensalidade_agendamentos_percent numeric(8,2),
  cobertura_mensalidade_reativacoes_percent numeric(8,2),
  gerado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, semana_inicio),
  check (semana_fim = semana_inicio + 6),
  check (extract(isodow from semana_inicio) = 1)
);

create index idx_relatorios_semanais_empresa_inicio
  on public.relatorios_semanais_empresa (empresa_id, semana_inicio desc);

create trigger trg_relatorios_semanais_empresa_atualizado
before update on public.relatorios_semanais_empresa
for each row execute function public.definir_atualizado_em();

alter table public.relatorios_semanais_empresa enable row level security;

grant select on public.relatorios_semanais_empresa to authenticated;

create policy relatorios_semanais_empresa_select on public.relatorios_semanais_empresa
for select to authenticated
using (
  public.eh_operador_plataforma()
  or public.eh_administrador_empresa(empresa_id)
);

create or replace function public.gerar_relatorio_semanal_empresa(
  p_empresa_id uuid,
  p_semana_inicio date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fuso_horario text;
  v_semana_fim date;
  v_inicio timestamptz;
  v_fim_exclusivo timestamptz;
  v_custo_mensal numeric(12,2);
  v_relatorio_id uuid;
begin
  if p_empresa_id is null or p_semana_inicio is null then
    raise exception 'Empresa e início da semana são obrigatórios';
  end if;

  if extract(isodow from p_semana_inicio) <> 1 then
    raise exception 'O início do relatório semanal deve ser uma segunda-feira';
  end if;

  select e.fuso_horario
  into v_fuso_horario
  from public.empresas e
  where e.id = p_empresa_id;

  if not found then
    raise exception 'Empresa não encontrada';
  end if;

  v_semana_fim := p_semana_inicio + 6;
  v_inicio := p_semana_inicio::timestamp at time zone v_fuso_horario;
  v_fim_exclusivo := (v_semana_fim + 1)::timestamp at time zone v_fuso_horario;

  -- A assinatura é única por empresa. O valor é salvo no relatório para que
  -- uma troca de plano posterior não reescreva a leitura da semana passada.
  select p.valor_mensal
  into v_custo_mensal
  from public.assinaturas a
  join public.planos p on p.id = a.plano_id
  where a.empresa_id = p_empresa_id;

  with
  agendamentos_criados as (
    select a.*
    from public.agendamentos a
    where a.empresa_id = p_empresa_id
      and a.criado_em >= v_inicio
      and a.criado_em < v_fim_exclusivo
  ),
  atendimentos_concluidos as (
    select a.*
    from public.agendamentos a
    where a.empresa_id = p_empresa_id
      and a.status = 'concluido'
      and coalesce(a.concluido_em, a.inicio_em) >= v_inicio
      and coalesce(a.concluido_em, a.inicio_em) < v_fim_exclusivo
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
  agendamentos_atribuidos_reativacao as (
    select a.id
    from agendamentos_criados a
    where a.status in ('confirmado', 'concluido')
      and exists (
        select 1
        from public.fila_mensagens f
        where f.empresa_id = p_empresa_id
          and f.cliente_id = a.cliente_id
          and f.tipo = 'reativacao'
          and f.estado = 'enviado'
          and f.enviado_em <= a.criado_em
          and f.enviado_em > a.criado_em - interval '90 days'
      )
  ),
  faturamento_atribuido_reativacao as (
    select a.preco
    from atendimentos_concluidos a
    where exists (
      select 1
      from public.fila_mensagens f
      where f.empresa_id = p_empresa_id
        and f.cliente_id = a.cliente_id
        and f.tipo = 'reativacao'
        and f.estado = 'enviado'
        and f.enviado_em <= a.criado_em
        and f.enviado_em > a.criado_em - interval '90 days'
    )
  ),
  metricas as (
    select
      (select count(*)::integer from agendamentos_criados) as agendamentos_criados,
      (select count(distinct cliente_id)::integer from agendamentos_criados) as clientes_agendaram,
      (select count(*)::integer from agendamentos_criados where origem = 'cliente_whatsapp') as agendamentos_whatsapp,
      (select count(*)::integer from atendimentos_concluidos) as atendimentos_concluidos,
      (
        select count(*)::integer
        from public.agendamentos a
        where a.empresa_id = p_empresa_id
          and a.status = 'faltou'
          and coalesce(a.faltou_em, a.inicio_em) >= v_inicio
          and coalesce(a.faltou_em, a.inicio_em) < v_fim_exclusivo
      ) as faltas,
      (select coalesce(sum(preco), 0)::numeric(12,2) from atendimentos_concluidos) as faturamento_agendamentos,
      (
        select count(*)::integer
        from public.fila_mensagens f
        where f.empresa_id = p_empresa_id
          and f.tipo in ('lembrete_24h', 'lembrete_2h')
          and f.estado = 'enviado'
          and f.enviado_em >= v_inicio
          and f.enviado_em < v_fim_exclusivo
      ) as lembretes_enviados,
      (
        select count(*)::integer
        from public.conversas c
        where c.empresa_id = p_empresa_id
          and c.criado_em >= v_inicio
          and c.criado_em < v_fim_exclusivo
      ) as conversas_iniciadas,
      (
        select count(*)::integer
        from public.mensagens m
        where m.empresa_id = p_empresa_id
          and m.direcao = 'entrada'
          and m.recebida_em >= v_inicio
          and m.recebida_em < v_fim_exclusivo
      ) as mensagens_recebidas,
      (select count(*)::integer from reativacoes_enviadas) as reativacoes_enviadas,
      (select count(*)::integer from agendamentos_atribuidos_reativacao) as reativacoes_convertidas,
      (select coalesce(sum(preco), 0)::numeric(12,2) from faturamento_atribuido_reativacao) as faturamento_reativacoes
  )
  insert into public.relatorios_semanais_empresa (
    empresa_id, semana_inicio, semana_fim, fuso_horario, custo_mensal_referencia,
    agendamentos_criados, clientes_agendaram, agendamentos_whatsapp,
    atendimentos_concluidos, faltas, faturamento_agendamentos, lembretes_enviados,
    conversas_iniciadas, mensagens_recebidas, reativacoes_enviadas,
    reativacoes_convertidas, faturamento_reativacoes,
    cobertura_mensalidade_agendamentos_percent,
    cobertura_mensalidade_reativacoes_percent
  )
  select
    p_empresa_id, p_semana_inicio, v_semana_fim, v_fuso_horario, v_custo_mensal,
    m.agendamentos_criados, m.clientes_agendaram, m.agendamentos_whatsapp,
    m.atendimentos_concluidos, m.faltas, m.faturamento_agendamentos, m.lembretes_enviados,
    m.conversas_iniciadas, m.mensagens_recebidas, m.reativacoes_enviadas,
    m.reativacoes_convertidas, m.faturamento_reativacoes,
    case when coalesce(v_custo_mensal, 0) > 0
      then round(100.0 * m.faturamento_agendamentos / v_custo_mensal, 2)
    end,
    case when coalesce(v_custo_mensal, 0) > 0
      then round(100.0 * m.faturamento_reativacoes / v_custo_mensal, 2)
    end
  from metricas m
  on conflict (empresa_id, semana_inicio) do update
  set semana_fim = excluded.semana_fim,
      fuso_horario = excluded.fuso_horario,
      custo_mensal_referencia = excluded.custo_mensal_referencia,
      agendamentos_criados = excluded.agendamentos_criados,
      clientes_agendaram = excluded.clientes_agendaram,
      agendamentos_whatsapp = excluded.agendamentos_whatsapp,
      atendimentos_concluidos = excluded.atendimentos_concluidos,
      faltas = excluded.faltas,
      faturamento_agendamentos = excluded.faturamento_agendamentos,
      lembretes_enviados = excluded.lembretes_enviados,
      conversas_iniciadas = excluded.conversas_iniciadas,
      mensagens_recebidas = excluded.mensagens_recebidas,
      reativacoes_enviadas = excluded.reativacoes_enviadas,
      reativacoes_convertidas = excluded.reativacoes_convertidas,
      faturamento_reativacoes = excluded.faturamento_reativacoes,
      cobertura_mensalidade_agendamentos_percent = excluded.cobertura_mensalidade_agendamentos_percent,
      cobertura_mensalidade_reativacoes_percent = excluded.cobertura_mensalidade_reativacoes_percent,
      gerado_em = now()
  returning id into v_relatorio_id;

  return v_relatorio_id;
end;
$$;

create or replace function public.gerar_relatorios_semanais_pendentes(
  p_semana_inicio date default (date_trunc('week', current_date)::date - 7)
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa record;
  v_gerados integer := 0;
begin
  if extract(isodow from p_semana_inicio) <> 1 then
    raise exception 'O início do relatório semanal deve ser uma segunda-feira';
  end if;

  for v_empresa in
    select id
    from public.empresas
    where status_operacional = 'ativo'
  loop
    perform public.gerar_relatorio_semanal_empresa(v_empresa.id, p_semana_inicio);
    v_gerados := v_gerados + 1;
  end loop;

  return v_gerados;
end;
$$;

revoke all on function public.gerar_relatorio_semanal_empresa(uuid, date) from public, anon, authenticated;
revoke all on function public.gerar_relatorios_semanais_pendentes(date) from public, anon, authenticated;

grant execute on function public.gerar_relatorio_semanal_empresa(uuid, date) to service_role;
grant execute on function public.gerar_relatorios_semanais_pendentes(date) to service_role;

comment on table public.relatorios_semanais_empresa is
  'Retratos semanais para a visão exclusiva do administrador. Faturamento de reativação é atribuído quando há reativação enviada ao mesmo cliente nos 90 dias anteriores à criação do agendamento.';
