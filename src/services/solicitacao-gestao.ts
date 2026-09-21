import type {
  EmpresaGestao,
  JsonAlteracaoEquipe,
  JsonHorario,
  JsonProfissional,
  JsonServico,
  JsonVinculo,
  RascunhoGestao,
  ResumoOcupacao,
} from '@/types/gestao'

export function calcularOcupacao(
  empresa: EmpresaGestao,
  rascunho: RascunhoGestao | null
): ResumoOcupacao {
  const ativos = empresa.profissionais.filter((p) => p.ativo)
  const atual = ativos.length
  const capacidade = empresa.plano.capacidadeProfissionais

  if (!rascunho) {
    return {
      atual,
      capacidade,
      proposta: atual,
      vagasDisponiveis: Math.max(0, capacidade - atual),
      acimaDoLimite: atual > capacidade,
    }
  }

  let proposta = atual

  for (const op of rascunho.operacoesProfissionais) {
    switch (op.tipo) {
      case 'inclusao':
        proposta++
        break
      case 'remocao':
        if (op.profissionalExistenteId) {
          const prof = empresa.profissionais.find((p) => p.id === op.profissionalExistenteId)
          if (prof?.ativo) proposta--
        }
        break
      case 'substituicao':
        break
    }
  }

  return {
    atual,
    capacidade,
    proposta,
    vagasDisponiveis: Math.max(0, capacidade - proposta),
    acimaDoLimite: proposta > capacidade,
  }
}

export function validarRascunho(
  empresa: EmpresaGestao,
  rascunho: RascunhoGestao
): { valido: boolean; erros: string[] } {
  const erros: string[] = []
  const ocupacao = calcularOcupacao(empresa, rascunho)

  if (ocupacao.acimaDoLimite) {
    erros.push(`A proposta excede a capacidade contratada de ${ocupacao.capacidade} profissionais.`)
  }

  // Chaves únicas entre novos profissionais
  const chavesProfissionais = new Set<string>()
  for (const op of rascunho.operacoesProfissionais) {
    const chave = op.chave ?? op.dadosNovos?.chave ?? op.dadosSubstituto?.chave
    if (chave) {
      if (chavesProfissionais.has(chave)) {
        erros.push(`Chave de profissional duplicada: ${chave}`)
      }
      chavesProfissionais.add(chave)
    }
  }

  // Chaves únicas entre novos serviços
  const chavesServicos = new Set<string>()
  for (const op of rascunho.operacoesServicos) {
    const chave = op.chave ?? op.dadosNovos?.chave
    if (chave) {
      if (chavesServicos.has(chave)) {
        erros.push(`Chave de serviço duplicada: ${chave}`)
      }
      chavesServicos.add(chave)
    }
  }

  // Impedir vínculo com serviço marcado para remoção
  const servicosRemovidos = new Set(
    rascunho.operacoesServicos
      .filter((op) => op.tipo === 'remocao')
      .map((op) => op.servicoExistenteId)
  )

  for (const op of rascunho.operacoesProfissionais) {
    const servicos = op.dadosNovos?.servicoIds ?? op.dadosSubstituto?.servicoIds ?? []
    for (const servicoId of servicos) {
      if (servicosRemovidos.has(servicoId)) {
        erros.push('Não é possível vincular profissional a serviço marcado para remoção.')
      }
    }
  }

  // Email obrigatório quando acesso_portal = true
  for (const op of rascunho.operacoesProfissionais) {
    const dados = op.dadosNovos ?? op.dadosSubstituto
    if (dados?.acessoPortal && !dados.email?.trim()) {
      erros.push(`Email é obrigatório quando acesso ao portal está ativo (${dados.chave}).`)
    }
  }

  // Validação de duração e preço
  for (const op of rascunho.operacoesServicos.filter((o) => o.tipo === 'adicao')) {
    if (op.dadosNovos) {
      if (!op.dadosNovos.duracaoMin || op.dadosNovos.duracaoMin <= 0) {
        erros.push(`Duração inválida para serviço ${op.dadosNovos.chave}.`)
      }
      if (op.dadosNovos.preco < 0) {
        erros.push(`Preço não pode ser negativo para serviço ${op.dadosNovos.chave}.`)
      }
    }
  }

  // Validação de horários
  for (const op of rascunho.operacoesProfissionais) {
    const horarios = op.dadosNovos?.horarios ?? op.dadosSubstituto?.horarios ?? []
    for (const h of horarios) {
      if (h.diaSemana < 0 || h.diaSemana > 6) {
        erros.push(`Dia da semana inválido para ${op.dadosNovos?.chave ?? op.dadosSubstituto?.chave}.`)
      }
      if (!h.horaInicio || !h.horaFim) {
        erros.push(`Horário incompleto para ${op.dadosNovos?.chave ?? op.dadosSubstituto?.chave}.`)
      }
    }
  }

  return { valido: erros.length === 0, erros }
}

export function gerarJsonSolicitacao(
  empresa: EmpresaGestao,
  rascunho: RascunhoGestao,
  solicitacaoIdExistente?: string
): JsonAlteracaoEquipe {
  const ocupacao = calcularOcupacao(empresa, rascunho)

  // solicitacao_id: reutilizar se existir e o conteúdo não mudou
  const solicitacaoId = solicitacaoIdExistente ?? gerarSolicitacaoId()

  // referencias_existentes: mapear IDs existentes para chaves lógicas
  const refsProfissionais: Array<{ chave: string; id: string }> = []
  const refsServicos: Array<{ chave: string; id: string }> = []
  const mapaIdParaChaveProf = new Map<string, string>()
  const mapaIdParaChaveServ = new Map<string, string>()

  // Profissionais existentes envolvidos em operações
  for (const op of rascunho.operacoesProfissionais) {
    if (op.profissionalExistenteId) {
      const prof = empresa.profissionais.find((p) => p.id === op.profissionalExistenteId)
      if (prof) {
        const chave = op.chave ?? `prof-existente-${prof.id.slice(0, 8)}`
        refsProfissionais.push({ chave, id: prof.id })
        mapaIdParaChaveProf.set(prof.id, chave)
      }
    }
  }

  // Serviços existentes envolvidos em operações
  for (const op of rascunho.operacoesServicos) {
    if (op.servicoExistenteId) {
      const serv = empresa.servicos.find((s) => s.id === op.servicoExistenteId)
      if (serv) {
        const chave = op.chave ?? `srv-existente-${serv.id.slice(0, 8)}`
        refsServicos.push({ chave, id: serv.id })
        mapaIdParaChaveServ.set(serv.id, chave)
      }
    }
  }

  // Profissionais novos (JSON)
  const profissionaisJson: JsonProfissional[] = []
  const profissionaisIncluir: string[] = []
  const profissionaisRemover: string[] = []
  const profissionaisSubstituir: Array<{ profissional_antigo_chave: string; profissional_novo_chave: string }> = []
  const vinculosJson: JsonVinculo[] = []
  const horariosJson: JsonHorario[] = []

  for (const op of rascunho.operacoesProfissionais) {
    if (op.tipo === 'inclusao' && op.dadosNovos) {
      const chave = op.dadosNovos.chave
      profissionaisJson.push({
        chave,
        nome: op.dadosNovos.nome,
        telefone: op.dadosNovos.telefone ?? null,
        email: op.dadosNovos.email ?? null,
        acesso_portal: op.dadosNovos.acessoPortal,
        cor_agenda: op.dadosNovos.corAgenda ?? '#6B7280',
        ativo: true,
      })
      profissionaisIncluir.push(chave)

      // Vínculos
      for (const servicoId of op.dadosNovos.servicoIds) {
        const servicoChave = mapaIdParaChaveServ.get(servicoId) ?? servicoId
        vinculosJson.push({ profissional_chave: chave, servico_chave: servicoChave, ativo: true })
      }

      // Horários
      for (const h of op.dadosNovos.horarios) {
        horariosJson.push({
          profissional_chave: chave,
          dia_semana: h.diaSemana,
          inicio: h.horaInicio,
          fim: h.horaFim,
          ativo: h.ativo,
        })
      }
    }

    if (op.tipo === 'remocao' && op.profissionalExistenteId) {
      const chaveAntiga = mapaIdParaChaveProf.get(op.profissionalExistenteId)
      if (chaveAntiga) profissionaisRemover.push(chaveAntiga)
    }

    if (op.tipo === 'substituicao' && op.profissionalExistenteId && op.dadosSubstituto) {
      const chaveAntiga = mapaIdParaChaveProf.get(op.profissionalExistenteId) ?? ''
      const chaveNova = op.dadosSubstituto.chave

      profissionaisJson.push({
        chave: chaveNova,
        nome: op.dadosSubstituto.nome,
        telefone: op.dadosSubstituto.telefone ?? null,
        email: op.dadosSubstituto.email ?? null,
        acesso_portal: op.dadosSubstituto.acessoPortal,
        cor_agenda: op.dadosSubstituto.corAgenda ?? '#6B7280',
        ativo: true,
      })

      profissionaisSubstituir.push({
        profissional_antigo_chave: chaveAntiga,
        profissional_novo_chave: chaveNova,
      })

      // Vínculos do substituto
      for (const servicoId of op.dadosSubstituto.servicoIds) {
        const servicoChave = mapaIdParaChaveServ.get(servicoId) ?? servicoId
        vinculosJson.push({ profissional_chave: chaveNova, servico_chave: servicoChave, ativo: true })
      }

      // Horários do substituto
      for (const h of op.dadosSubstituto.horarios) {
        horariosJson.push({
          profissional_chave: chaveNova,
          dia_semana: h.diaSemana,
          inicio: h.horaInicio,
          fim: h.horaFim,
          ativo: h.ativo,
        })
      }
    }
  }

  // Serviços novos (JSON)
  const servicosJson: JsonServico[] = []
  const servicosIncluir: string[] = []
  const servicosRemover: string[] = []
  const vinculosDesvincular: Array<{ profissional_chave: string; servico_chave: string }> = []

  for (const op of rascunho.operacoesServicos) {
    if (op.tipo === 'adicao' && op.dadosNovos) {
      servicosJson.push({
        chave: op.dadosNovos.chave,
        nome: op.dadosNovos.nome,
        descricao: op.dadosNovos.descricao ?? null,
        duracao_min: op.dadosNovos.duracaoMin,
        preco: op.dadosNovos.preco,
        prazo_reativacao_dias: op.dadosNovos.prazoReativacaoDias ?? 30,
        requer_avaliacao: op.dadosNovos.requerAvaliacao,
        ativo: true,
        ordem_exibicao: op.dadosNovos.ordemExibicao,
      })
      servicosIncluir.push(op.dadosNovos.chave)
    }

    if (op.tipo === 'remocao' && op.servicoExistenteId) {
      const chave = mapaIdParaChaveServ.get(op.servicoExistenteId)
      if (chave) servicosRemover.push(chave)
    }

    if (op.tipo === 'desvincular' && op.servicoExistenteId && op.profissionalIdsAfetados) {
      const servicoChave = mapaIdParaChaveServ.get(op.servicoExistenteId) ?? op.servicoExistenteId
      for (const profId of op.profissionalIdsAfetados) {
        const profChave = mapaIdParaChaveProf.get(profId) ?? profId
        vinculosDesvincular.push({ profissional_chave: profChave, servico_chave: servicoChave })
      }
    }
  }

  return {
    versao: 'alteracao-equipe/1.0',
    tipo: 'ALTERACAO_EMPRESA_EXISTENTE',
    solicitacao_id: solicitacaoId,
    solicitado_em: new Date().toISOString(),
    empresa: {
      id: empresa.id,
      codigo: empresa.codigo,
      nome_fantasia: empresa.nomeFantasia,
    },
    admin: {
      nome: empresa.admin?.nome ?? '',
      email: empresa.admin?.email ?? '',
    },
    plano_codigo: empresa.plano.codigo,
    ocupacao_informativa: {
      atual: ocupacao.atual,
      limite_contratado: ocupacao.capacidade,
      proposta: ocupacao.proposta,
    },
    referencias_existentes: {
      profissionais: refsProfissionais,
      servicos: refsServicos,
    },
    profissionais: profissionaisJson,
    servicos: servicosJson,
    profissional_servicos: vinculosJson,
    horarios_profissionais: horariosJson,
    alteracoes: {
      profissionais_incluir: profissionaisIncluir,
      profissionais_remover: profissionaisRemover,
      profissionais_substituir: profissionaisSubstituir,
      servicos_incluir: servicosIncluir,
      servicos_remover: servicosRemover,
      vinculos_desvincular: vinculosDesvincular,
    },
  }
}

function gerarSolicitacaoId(): string {
  return crypto.randomUUID?.() ?? `sol-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
