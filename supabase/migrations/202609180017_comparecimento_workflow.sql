-- PREPARADA, NÃO APLICADA. Conferir preflight e autorizar implantação primeiro.
-- Regra confirmada em 18/09/2026: a partir de inicio_em (inclusive).
begin;

-- Falhar se o nome já existir: não reutilizar um login com privilégios desconhecidos.
create role agenda24h_comparecimento login noinherit nosuperuser nocreatedb
  nocreaterole noreplication nobypassrls connection limit 5;
alter role agenda24h_comparecimento set statement_timeout = '10s';
alter role agenda24h_comparecimento set lock_timeout = '3s';
grant connect on database postgres to agenda24h_comparecimento;
grant usage on schema public to agenda24h_comparecimento;

create schema comparecimento_interno;
revoke all on schema comparecimento_interno from public, anon, authenticated, service_role;
-- Registro técnico de idempotência, não uma nova tabela de auditoria.
create table comparecimento_interno.solicitacoes (
  usuario_id uuid not null,
  solicitacao_id uuid not null,
  agendamento_id uuid not null,
  resposta text not null check (resposta in ('sim','nao')),
  resultado jsonb not null,
  criado_em timestamptz not null default clock_timestamp(),
  primary key (usuario_id, solicitacao_id)
);
revoke all on comparecimento_interno.solicitacoes from public, anon, authenticated, service_role;
alter table comparecimento_interno.solicitacoes enable row level security;

create function public.registrar_comparecimento_workflow(
  p_usuario_id uuid, p_solicitacao_id uuid, p_agendamento_id uuid, p_resposta text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog
set lock_timeout = '3s'
as $$
declare
  a public.agendamentos%rowtype;
  m public.membros_empresa%rowtype;
  r comparecimento_interno.solicitacoes%rowtype;
  v_status public.agendamento_status;
  v_agora timestamptz;
  v_repeticao boolean := false;
  v_resultado jsonb;
  v_cancelados integer := 0;
begin
  -- Identidade somente do GET /auth/v1/user validado pelo workflow.
  -- A função NÃO aceita chamadas do navegador, nem mesmo via service_role.
  if p_usuario_id is null or p_solicitacao_id is null or p_agendamento_id is null
     or p_resposta is null or p_resposta not in ('sim','nao') then
    return jsonb_build_object('http_status',400,'sucesso',false,'codigo','ENTRADA_INVALIDA');
  end if;
  -- Serializa uma chave lógica inclusive se reutilizada em outro agendamento.
  perform pg_advisory_xact_lock(hashtextextended(p_usuario_id::text || ':' || p_solicitacao_id::text, 0));
  select * into a from public.agendamentos where id = p_agendamento_id for update;
  if not found then
    return jsonb_build_object('http_status',403,'sucesso',false,'codigo','SEM_PERMISSAO');
  end if;
  select * into m from public.membros_empresa
   where usuario_id = p_usuario_id and empresa_id = a.empresa_id and ativo for share;
  if not found then
    return jsonb_build_object('http_status',403,'sucesso',false,'codigo','SEM_PERMISSAO');
  end if;
  if m.papel_acesso::text = 'profissional' then
    if m.profissional_id is distinct from a.profissional_id then
      return jsonb_build_object('http_status',403,'sucesso',false,'codigo','SEM_PERMISSAO');
    end if;
    perform 1 from public.profissionais
      where id = m.profissional_id and empresa_id = a.empresa_id and ativo for share;
    if not found then
      return jsonb_build_object('http_status',403,'sucesso',false,'codigo','SEM_PERMISSAO');
    end if;
  elsif m.papel_acesso::text <> 'administrador' then
    return jsonb_build_object('http_status',403,'sucesso',false,'codigo','SEM_PERMISSAO');
  end if;
  -- Revalida autorização antes de qualquer replay.
  select * into r from comparecimento_interno.solicitacoes
    where usuario_id = p_usuario_id and solicitacao_id = p_solicitacao_id;
  if found then
    if r.agendamento_id <> p_agendamento_id or r.resposta <> p_resposta then
      return jsonb_build_object('http_status',409,'sucesso',false,'codigo','SOLICITACAO_REUTILIZADA');
    end if;
    return r.resultado || jsonb_build_object('repeticao',true);
  end if;
  v_status := case when p_resposta = 'sim' then 'concluido' else 'faltou' end;
  if a.status = v_status then
    v_repeticao := true;
  elsif a.status <> 'confirmado' then
    return jsonb_build_object('http_status',409,'sucesso',false,'codigo','ESTADO_INCOMPATIVEL');
  else
    v_agora := clock_timestamp();
    if v_agora < a.inicio_em then
      return jsonb_build_object('http_status',409,'sucesso',false,'codigo','ANTES_DO_INICIO');
    end if;
    -- Mesmo lock usado pela reserva da fila: ou cancela antes da reserva,
    -- ou enxerga processando e recusa toda a transação de comparecimento.
    perform 1 from public.fila_mensagens
      where agendamento_id = a.id and empresa_id = a.empresa_id
        and tipo in ('lembrete_24h','lembrete_2h') order by id for update;
    if exists (select 1 from public.fila_mensagens
      where agendamento_id = a.id and empresa_id = a.empresa_id
        and tipo in ('lembrete_24h','lembrete_2h') and estado = 'processando') then
      return jsonb_build_object('http_status',409,'sucesso',false,'codigo','LEMBRETE_EM_PROCESSAMENTO');
    end if;
    update public.fila_mensagens set estado = 'cancelado', cancelado_em = v_agora
      where agendamento_id = a.id and empresa_id = a.empresa_id
        and tipo in ('lembrete_24h','lembrete_2h') and estado in ('pendente','falhou');
    get diagnostics v_cancelados = row_count;
    update public.agendamentos
      set status = v_status,
          concluido_em = case when v_status = 'concluido' then v_agora else null end,
          faltou_em = case when v_status = 'faltou' then v_agora else null end
      where id = a.id returning * into a;
    insert into public.agendamento_eventos
      (empresa_id,agendamento_id,tipo,origem,ator_tipo,membro_empresa_id,dados_anteriores,dados_novos,criado_em)
      values (a.empresa_id,a.id,'comparecimento_registrado','portal','membro_empresa',m.id,
        jsonb_build_object('status','confirmado'),
        jsonb_build_object('status',a.status,'concluido_em',a.concluido_em,'faltou_em',a.faltou_em,
          'usuario_id',p_usuario_id,'solicitacao_id',p_solicitacao_id),v_agora);
    insert into public.logs_auditoria
      (empresa_id,entidade_tipo,entidade_id,acao,ator_tipo,ator_id,resultado,correlation_id,metadados_sanitizados,ocorrido_em)
      values (a.empresa_id,'agendamento',a.id,'registrar_comparecimento','usuario',p_usuario_id,'sucesso',
        p_solicitacao_id,jsonb_build_object('status_anterior','confirmado','status_novo',a.status,
          'membro_empresa_id',m.id,'lembretes_cancelados',v_cancelados),v_agora);
  end if;
  v_resultado := jsonb_build_object('http_status',200,'sucesso',true,'agendamento_id',a.id,
    'status',a.status,'concluido_em',a.concluido_em,'faltou_em',a.faltou_em,'repeticao',v_repeticao,
    'mensagem',case when a.status = 'concluido' then 'Atendimento registrado como concluído.' else 'Falta do cliente registrada.' end);
  insert into comparecimento_interno.solicitacoes(usuario_id,solicitacao_id,agendamento_id,resposta,resultado)
    values(p_usuario_id,p_solicitacao_id,p_agendamento_id,p_resposta,v_resultado);
  return v_resultado;
  -- Erros SQL não são engolidos: UPDATE, auditoria e idempotência revertem juntos.
end;
$$;
revoke all on function public.registrar_comparecimento_workflow(uuid,uuid,uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.registrar_comparecimento_workflow(uuid,uuid,uuid,text)
  to agenda24h_comparecimento;
-- Não alterar grants/policies de agendamentos: nenhuma escrita ao navegador.
commit;
