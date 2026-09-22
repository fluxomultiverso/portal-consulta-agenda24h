-- PREPARADA, NÃO APLICADA. Gestão de equipe/serviços somente pelo workflow n8n.
alter type public.membro_papel add value if not exists 'recepcionista';

begin;
alter table public.membros_empresa add column if not exists telefone text;
alter table public.assinaturas add column if not exists limite_recepcionistas_contratado smallint not null default 0 check (limite_recepcionistas_contratado >= 0);
update public.assinaturas a set limite_recepcionistas_contratado = case p.codigo when 'empresa' then 2 when 'equipe' then 1 else 0 end from public.planos p where p.id=a.plano_id and a.limite_recepcionistas_contratado=0;

do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid='public.membros_empresa'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%papel_acesso%';
  if c is not null then execute format('alter table public.membros_empresa drop constraint %I',c); end if;
end $$;
alter table public.membros_empresa add constraint membros_empresa_papel_profissional_check check (
 papel_acesso='administrador' or
 (papel_acesso='recepcionista' and profissional_id is null) or
 (papel_acesso='profissional' and profissional_id is not null)
);

create schema if not exists gestao_interno;
revoke all on schema gestao_interno from public,anon,authenticated,service_role;
create table if not exists gestao_interno.solicitacoes(
 usuario_id uuid not null, solicitacao_id uuid not null, empresa_id uuid not null,
 payload_hash text not null, resultado jsonb not null, criado_em timestamptz not null default clock_timestamp(),
 primary key(usuario_id,solicitacao_id)
);
revoke all on gestao_interno.solicitacoes from public,anon,authenticated,service_role;
alter table gestao_interno.solicitacoes enable row level security;

do $$ begin
 if not exists(select 1 from pg_roles where rolname='agenda24h_gestao') then create role agenda24h_gestao nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 5; end if;
end $$;
alter role agenda24h_gestao set statement_timeout='15s';
alter role agenda24h_gestao set lock_timeout='3s';
grant connect on database postgres to agenda24h_gestao;
grant usage on schema public to agenda24h_gestao;

create or replace function public.aplicar_gestao_workflow(p_usuario_id uuid,p_solicitacao_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set lock_timeout='3s' as $$
declare m public.membros_empresa%rowtype; a public.assinaturas%rowtype; r gestao_interno.solicitacoes%rowtype; op jsonb; d jsonb; v_id uuid; v_hash text; v_result jsonb; v_prof integer; v_recep integer;
begin
 if p_usuario_id is null or p_solicitacao_id is null or p_payload is null or pg_column_size(p_payload)>262144 then return jsonb_build_object('http_status',400,'sucesso',false,'codigo','ENTRADA_INVALIDA'); end if;
 if p_payload->>'versao'<>'gestao-empresa/2.0' or p_payload->>'tipo'<>'ALTERACAO_EMPRESA_EXISTENTE' or p_payload->>'solicitacao_id'<>p_solicitacao_id::text then return jsonb_build_object('http_status',400,'sucesso',false,'codigo','CONTRATO_INVALIDO'); end if;
 select * into m from public.membros_empresa where usuario_id=p_usuario_id and ativo and papel_acesso='administrador' order by criado_em limit 1 for share;
 if not found or p_payload#>>'{empresa,id}'<>m.empresa_id::text then return jsonb_build_object('http_status',403,'sucesso',false,'codigo','SEM_PERMISSAO'); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_usuario_id::text||':'||p_solicitacao_id::text,0));
 v_hash:=md5(p_payload::text); select * into r from gestao_interno.solicitacoes where usuario_id=p_usuario_id and solicitacao_id=p_solicitacao_id;
 if found then if r.payload_hash<>v_hash then return jsonb_build_object('http_status',409,'sucesso',false,'codigo','SOLICITACAO_REUTILIZADA'); end if; return r.resultado||jsonb_build_object('repeticao',true); end if;
 if jsonb_array_length(coalesce(p_payload#>'{operacoes,profissionais}','[]'))+jsonb_array_length(coalesce(p_payload#>'{operacoes,recepcionistas}','[]'))+jsonb_array_length(coalesce(p_payload#>'{operacoes,servicos}','[]'))>100 then return jsonb_build_object('http_status',400,'sucesso',false,'codigo','MUITAS_OPERACOES'); end if;
 select * into a from public.assinaturas where empresa_id=m.empresa_id for share;
 v_prof:=(select count(*) from public.profissionais where empresa_id=m.empresa_id and ativo)+(select count(*) from jsonb_array_elements(coalesce(p_payload#>'{operacoes,profissionais}','[]')) x where x->>'acao'='incluir')-(select count(*) from jsonb_array_elements(coalesce(p_payload#>'{operacoes,profissionais}','[]')) x where x->>'acao'='remover');
 v_recep:=(select count(*) from public.membros_empresa where empresa_id=m.empresa_id and ativo and papel_acesso='recepcionista')+(select count(*) from jsonb_array_elements(coalesce(p_payload#>'{operacoes,recepcionistas}','[]')) x where x->>'acao'='incluir')-(select count(*) from jsonb_array_elements(coalesce(p_payload#>'{operacoes,recepcionistas}','[]')) x where x->>'acao'='remover');
 if v_prof<0 or v_prof>a.limite_profissionais_contratado or v_recep<0 or v_recep>a.limite_recepcionistas_contratado then return jsonb_build_object('http_status',409,'sucesso',false,'codigo','LIMITE_DO_PLANO'); end if;

 for op in select * from jsonb_array_elements(coalesce(p_payload#>'{operacoes,servicos}','[]')) loop d:=op->'dados';
  if op->>'acao'='incluir' then insert into public.servicos(empresa_id,nome,descricao,duracao_min,preco,prazo_reativacao_dias,requer_avaliacao,ativo,ordem_exibicao) values(m.empresa_id,d->>'nome',d->>'descricao',(d->>'duracao_min')::smallint,(d->>'preco')::numeric,(d->>'prazo_reativacao_dias')::smallint,coalesce((d->>'requer_avaliacao')::boolean,false),true,coalesce((d->>'ordem_exibicao')::smallint,0));
  elsif op->>'acao'='editar' then update public.servicos set nome=d->>'nome',descricao=d->>'descricao',duracao_min=(d->>'duracao_min')::smallint,preco=(d->>'preco')::numeric,prazo_reativacao_dias=(d->>'prazo_reativacao_dias')::smallint,requer_avaliacao=coalesce((d->>'requer_avaliacao')::boolean,false),atualizado_em=clock_timestamp() where id=(op->>'id')::uuid and empresa_id=m.empresa_id; if not found then raise exception 'Serviço não encontrado'; end if;
  elsif op->>'acao'='remover' then update public.servicos set ativo=false,atualizado_em=clock_timestamp() where id=(op->>'id')::uuid and empresa_id=m.empresa_id; update public.profissional_servicos set ativo=false,atualizado_em=clock_timestamp() where servico_id=(op->>'id')::uuid and empresa_id=m.empresa_id;
  else raise exception 'Ação de serviço inválida'; end if;
 end loop;

 for op in select * from jsonb_array_elements(coalesce(p_payload#>'{operacoes,profissionais}','[]')) loop d:=op->'dados';
  if op->>'acao'='incluir' then insert into public.profissionais(empresa_id,nome,telefone,email,cor_agenda,ativo) values(m.empresa_id,d->>'nome',d->>'telefone',d->>'email',d->>'cor_agenda',true) returning id into v_id;
  elsif op->>'acao'='editar' then v_id:=(op->>'id')::uuid; update public.profissionais set nome=d->>'nome',telefone=d->>'telefone',email=d->>'email',cor_agenda=d->>'cor_agenda',atualizado_em=clock_timestamp() where id=v_id and empresa_id=m.empresa_id; if not found then raise exception 'Profissional não encontrado'; end if;
  elsif op->>'acao'='remover' then v_id:=(op->>'id')::uuid; update public.profissionais set ativo=false,atualizado_em=clock_timestamp() where id=v_id and empresa_id=m.empresa_id; update public.membros_empresa set ativo=false,atualizado_em=clock_timestamp() where profissional_id=v_id and empresa_id=m.empresa_id; continue;
  else raise exception 'Ação de profissional inválida'; end if;
  update public.profissional_servicos set ativo=false,atualizado_em=clock_timestamp() where profissional_id=v_id and empresa_id=m.empresa_id;
  insert into public.profissional_servicos(empresa_id,profissional_id,servico_id,ativo) select m.empresa_id,v_id,value::text::uuid,true from jsonb_array_elements(op->'servico_ids') on conflict(empresa_id,profissional_id,servico_id) do update set ativo=true,atualizado_em=clock_timestamp();
  delete from public.horarios_profissionais where profissional_id=v_id and empresa_id=m.empresa_id;
  insert into public.horarios_profissionais(empresa_id,profissional_id,dia_semana,inicio,fim,ativo) select m.empresa_id,v_id,(x->>'dia_semana')::smallint,(x->>'inicio')::time,(x->>'fim')::time,coalesce((x->>'ativo')::boolean,true) from jsonb_array_elements(op->'horarios') x;
  if coalesce((d->>'acesso_portal')::boolean,false) then
   if nullif(d->>'usuario_id','') is null then update public.membros_empresa set nome_exibicao=d->>'nome',telefone=d->>'telefone',ativo=true,atualizado_em=clock_timestamp() where profissional_id=v_id and empresa_id=m.empresa_id; if not found then raise exception 'usuario_id ausente para acesso do profissional'; end if;
   else insert into public.membros_empresa(empresa_id,usuario_id,profissional_id,nome_exibicao,papel_acesso,telefone,ativo) values(m.empresa_id,(d->>'usuario_id')::uuid,v_id,d->>'nome','profissional',d->>'telefone',true) on conflict(empresa_id,usuario_id) do update set profissional_id=v_id,nome_exibicao=excluded.nome_exibicao,papel_acesso='profissional',telefone=excluded.telefone,ativo=true,atualizado_em=clock_timestamp(); end if;
  else update public.membros_empresa set ativo=false,atualizado_em=clock_timestamp() where profissional_id=v_id and empresa_id=m.empresa_id; end if;
 end loop;

 for op in select * from jsonb_array_elements(coalesce(p_payload#>'{operacoes,recepcionistas}','[]')) loop d:=op->'dados';
  if op->>'acao'='incluir' then if nullif(d->>'usuario_id','') is null then raise exception 'usuario_id ausente para recepcionista'; end if; insert into public.membros_empresa(empresa_id,usuario_id,nome_exibicao,papel_acesso,telefone,ativo) values(m.empresa_id,(d->>'usuario_id')::uuid,d->>'nome','recepcionista',d->>'telefone',true) on conflict(empresa_id,usuario_id) do update set nome_exibicao=excluded.nome_exibicao,papel_acesso='recepcionista',profissional_id=null,telefone=excluded.telefone,ativo=true,atualizado_em=clock_timestamp();
  elsif op->>'acao'='editar' then update public.membros_empresa set nome_exibicao=d->>'nome',telefone=d->>'telefone',atualizado_em=clock_timestamp() where id=(op->>'id')::uuid and empresa_id=m.empresa_id and papel_acesso='recepcionista'; if not found then raise exception 'Recepcionista não encontrada'; end if;
  elsif op->>'acao'='remover' then update public.membros_empresa set ativo=false,atualizado_em=clock_timestamp() where id=(op->>'id')::uuid and empresa_id=m.empresa_id and papel_acesso='recepcionista';
  else raise exception 'Ação de recepcionista inválida'; end if;
 end loop;
 v_result:=jsonb_build_object('http_status',200,'sucesso',true,'solicitacao_id',p_solicitacao_id,'mensagem','Alterações aplicadas com sucesso.','repeticao',false);
 insert into gestao_interno.solicitacoes values(p_usuario_id,p_solicitacao_id,m.empresa_id,v_hash,v_result,clock_timestamp()); return v_result;
exception when unique_violation then return jsonb_build_object('http_status',409,'sucesso',false,'codigo','DADO_DUPLICADO'); when others then raise;
end $$;
revoke all on function public.aplicar_gestao_workflow(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.aplicar_gestao_workflow(uuid,uuid,jsonb) to agenda24h_gestao;

create or replace function public.consultar_gestao_portal() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v jsonb; begin select jsonb_build_object('id',e.id,'codigo',e.codigo,'nomeFantasia',e.nome_fantasia,'admin',jsonb_build_object('nome',m.nome_exibicao,'email',coalesce(auth.jwt()->>'email','')),'plano',jsonb_build_object('codigo',pl.codigo,'nome',pl.nome,'capacidadeProfissionais',a.limite_profissionais_contratado,'capacidadeRecepcionistas',a.limite_recepcionistas_contratado),'profissionais',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'usuarioId',(select mp.usuario_id from public.membros_empresa mp where mp.empresa_id=p.empresa_id and mp.profissional_id=p.id and mp.ativo limit 1),'nome',p.nome,'email',p.email,'telefone',p.telefone,'ativo',p.ativo,'acessoPortal',exists(select 1 from public.membros_empresa mp where mp.empresa_id=p.empresa_id and mp.profissional_id=p.id and mp.ativo),'corAgenda',p.cor_agenda,'servicoIds',coalesce((select jsonb_agg(ps.servico_id) from public.profissional_servicos ps where ps.profissional_id=p.id and ps.empresa_id=p.empresa_id and ps.ativo),'[]'),'horarios',coalesce((select jsonb_agg(jsonb_build_object('diaSemana',h.dia_semana,'horaInicio',h.inicio,'horaFim',h.fim,'ativo',h.ativo)) from public.horarios_profissionais h where h.profissional_id=p.id and h.empresa_id=p.empresa_id and h.ativo),'[]')) order by p.nome) from public.profissionais p where p.empresa_id=e.id),'[]'),'recepcionistas',coalesce((select jsonb_agg(jsonb_build_object('id',mr.id,'usuarioId',mr.usuario_id,'nome',mr.nome_exibicao,'email',coalesce(u.email,''),'telefone',mr.telefone,'ativo',mr.ativo,'criadoEm',mr.criado_em,'atualizadoEm',mr.atualizado_em)) from public.membros_empresa mr join auth.users u on u.id=mr.usuario_id where mr.empresa_id=e.id and mr.papel_acesso='recepcionista'),'[]'),'servicos',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'nome',s.nome,'descricao',s.descricao,'duracaoMinutos',s.duracao_min,'preco',s.preco,'prazoReativacaoDias',s.prazo_reativacao_dias,'requerAvaliacao',s.requer_avaliacao,'ordemExibicao',s.ordem_exibicao,'ativo',s.ativo)) from public.servicos s where s.empresa_id=e.id),'[]')) into v from public.membros_empresa m join public.empresas e on e.id=m.empresa_id join public.assinaturas a on a.empresa_id=e.id join public.planos pl on pl.id=a.plano_id where m.usuario_id=auth.uid() and m.ativo and m.papel_acesso='administrador' limit 1; if v is null then raise exception 'Acesso administrativo não autorizado'; end if; return v; end $$;
revoke all on function public.consultar_gestao_portal() from public,anon; grant execute on function public.consultar_gestao_portal() to authenticated;
commit;

-- Antes de ativar o workflow: ALTER ROLE agenda24h_gestao LOGIN PASSWORD '<senha-forte>';


-- A recepcionista consulta a agenda completa, sem acesso administrativo.
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
    and (m.papel_acesso::text in ('administrador','recepcionista') or p.id = m.profissional_id)
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
    and (v_membro.papel_acesso::text in ('administrador','recepcionista') or a.profissional_id = v_membro.profissional_id)
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
    and (v_membro.papel_acesso::text in ('administrador','recepcionista') or a.profissional_id = v_membro.profissional_id);
end;
$$;





-- Recepcionistas podem registrar comparecimento para qualquer profissional da empresa.
create or replace function public.registrar_comparecimento_workflow(
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
  elsif m.papel_acesso::text not in ('administrador','recepcionista') then
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

