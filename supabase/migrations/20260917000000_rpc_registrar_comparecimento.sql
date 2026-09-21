-- ============================================================================
-- Migration: RPC registrar_comparecimento
-- Data: 2026-09-17
-- Descrição: Função para registrar comparecimento (concluído ou faltou)
--            com validação de permissões e proteção contra concorrência.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Verificar pré-requisitos
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Verificar se a tabela agendamentos existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agendamentos'
  ) THEN
    RAISE EXCEPTION 'Tabela public.agendamentos não encontrada';
  END IF;

  -- Verificar se as colunas necessárias existem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agendamentos' AND column_name = 'status'
  ) THEN
    RAISE EXCEPTION 'Coluna status não encontrada em public.agendamentos';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Criar a função RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_comparecimento(
  p_agendamento_id UUID,
  p_resposta TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id UUID;
  v_empresa_id UUID;
  v_profissional_id UUID;
  v_papel TEXT;
  v_agendamento public.agendamentos;
  v_status_atual TEXT;
  v_resultado JSONB;
BEGIN
  -- --------------------------------------------------------------------------
  -- Validação de entrada
  -- --------------------------------------------------------------------------
  IF p_resposta NOT IN ('sim', 'nao') THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'resposta_invalida',
      'mensagem', 'Resposta deve ser "sim" ou "nao".'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- Obter usuário autenticado
  -- --------------------------------------------------------------------------
  v_usuario_id := auth.uid();

  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'nao_autenticado',
      'mensagem', 'Usuário não autenticado.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- Buscar vínculo do usuário com a empresa
  -- --------------------------------------------------------------------------
  SELECT me.empresa_id, me.profissional_id, me.papel
  INTO v_empresa_id, v_profissional_id, v_papel
  public.membros_empresa me
  WHERE me.usuario_id = v_usuario_id
    AND me.ativo = true
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'sem_vinculo',
      'mensagem', 'Usuário sem vínculo ativo com nenhuma empresa.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- Buscar agendamento com lock para concorrência
  -- --------------------------------------------------------------------------
  SELECT a.*
  INTO v_agendamento
  FROM public.agendamentos a
  WHERE a.id = p_agendamento_id
    AND a.empresa_id = v_empresa_id
  FOR UPDATE;

  IF v_agendamento.id IS NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'nao_encontrado',
      'mensagem', 'Agendamento não encontrado ou não pertence à empresa.'
    );
  END IF;

  v_status_atual := v_agendamento.status::text;

  -- --------------------------------------------------------------------------
  -- Validar permissão: admin da empresa ou profissional responsável
  -- --------------------------------------------------------------------------
  IF v_papel NOT IN ('administrador', 'admin') THEN
    IF v_profissional_id IS NULL OR v_profissional_id != v_agendamento.profissional_id THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'erro', 'sem_permissao',
        'mensagem', 'Você não tem permissão para registrar comparecimento deste agendamento.'
      );
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Validar status: somente agendamentos confirmados podem receber resultado
  -- --------------------------------------------------------------------------
  IF v_status_atual != 'confirmado' THEN
    -- Verificar se é uma repetição da mesma resposta (idempotência)
    IF p_resposta = 'sim' AND v_status_atual = 'concluido' THEN
      RETURN jsonb_build_object(
        'sucesso', true,
        'agendamento_id', v_agendamento.id,
        'status', v_status_atual,
        'concluido_em', v_agendamento.concluido_em,
        'repeticao', true,
        'mensagem', 'Agendamento já registrado como concluído.'
      );
    END IF;

    IF p_resposta = 'nao' AND v_status_atual = 'faltou' THEN
      RETURN jsonb_build_object(
        'sucesso', true,
        'agendamento_id', v_agendamento.id,
        'status', v_status_atual,
        'faltou_em', v_agendamento.faltou_em,
        'repeticao', true,
        'mensagem', 'Agendamento já registrado como falta.'
      );
    END IF;

    -- Tentativa de trocar resultado já registrado
    IF v_status_atual IN ('concluido', 'faltou') THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'erro', 'resultado_ja_registrado',
        'mensagem', 'Este agendamento já possui um resultado registrado e não pode ser alterado.',
        'status_atual', v_status_atual
      );
    END IF;

    -- Agendamento cancelado
    IF v_status_atual = 'cancelado' THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'erro', 'agendamento_cancelado',
        'mensagem', 'Não é possível registrar comparecimento para agendamento cancelado.'
      );
    END IF;

    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'status_invalido',
      'mensagem', 'Agendamento não está em status confirmado.',
      'status_atual', v_status_atual
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- Registrar o resultado
  -- --------------------------------------------------------------------------
  IF p_resposta = 'sim' THEN
    UPDATE public.agendamentos
    SET status = 'concluido',
        concluido_em = now(),
        atualizado_em = now()
    WHERE id = p_agendamento_id
    RETURNING jsonb_build_object(
      'sucesso', true,
      'agendamento_id', id,
      'status', status::text,
      'concluido_em', concluido_em,
      'repeticao', false,
      'mensagem', 'Atendimento registrado como concluído.'
    ) INTO v_resultado;
  ELSE
    UPDATE public.agendamentos
    SET status = 'faltou',
        faltou_em = now(),
        atualizado_em = now()
    WHERE id = p_agendamento_id
    RETURNING jsonb_build_object(
      'sucesso', true,
      'agendamento_id', id,
      'status', status::text,
      'faltou_em', faltou_em,
      'repeticao', false,
      'mensagem', 'Falta do cliente registrada.'
    ) INTO v_resultado;
  END IF;

  -- --------------------------------------------------------------------------
  -- Registrar evento de auditoria (se tabela existir)
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eventos_auditoria'
  ) THEN
    INSERT INTO public.eventos_auditoria (
      empresa_id,
      agendamento_id,
      tipo_evento,
      usuario_id,
      dados_evento,
      criado_em
    ) VALUES (
      v_empresa_id,
      p_agendamento_id,
      CASE WHEN p_resposta = 'sim' THEN 'comparecimento_confirmado' ELSE 'comparecimento_falta' END,
      v_usuario_id,
      jsonb_build_object(
        'resposta', p_resposta,
        'status_anterior', v_status_atual,
        'status_novo', CASE WHEN p_resposta = 'sim' THEN 'concluido' ELSE 'faltou' END
      ),
      now()
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- Invalidar lembretes pendentes (se tabela existir)
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lembretes'
  ) THEN
    UPDATE public.lembretes
    SET status = 'invalidado',
        atualizado_em = now()
    WHERE agendamento_id = p_agendamento_id
      AND status IN ('pendente', 'agendado');
  END IF;

  RETURN v_resultado;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Conceder permissão de execução apenas ao papel authenticated
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.registrar_comparecimento(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_comparecimento(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. NÃO conceder UPDATE geral na tabela agendamentos ao navegador
-- ----------------------------------------------------------------------------
-- As políticas RLS existentes devem permanecer sem UPDATE para authenticated.
-- A única forma de alterar status é via esta RPC.

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
