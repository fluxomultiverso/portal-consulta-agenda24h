import type {
  DadosProfissionalNovo,
  DadosRecepcionista,
  DadosServicoNovo,
  EmpresaGestao,
  JsonAlteracaoEquipe,
  JsonHorario,
  JsonProfissional,
  JsonRecepcionista,
  JsonServico,
  RascunhoGestao,
  ResumoOcupacao,
} from '@/types/gestao'

export function calcularOcupacao(empresa: EmpresaGestao, rascunho: RascunhoGestao | null): ResumoOcupacao {
  const atual = empresa.profissionais.filter((p) => p.ativo).length
  const recepcionistasAtuais = empresa.recepcionistas.filter((p) => p.ativo).length
  let proposta = atual
  let recepcionistasPropostos = recepcionistasAtuais

  for (const op of rascunho?.operacoesProfissionais ?? []) {
    if (op.tipo === 'inclusao') proposta++
    if (op.tipo === 'remocao' && empresa.profissionais.some((p) => p.id === op.profissionalExistenteId && p.ativo)) proposta--
  }
  for (const op of rascunho?.operacoesRecepcionistas ?? []) {
    if (op.tipo === 'inclusao') recepcionistasPropostos++
    if (op.tipo === 'remocao' && empresa.recepcionistas.some((p) => p.id === op.recepcionistaExistenteId && p.ativo)) recepcionistasPropostos--
  }

  return {
    atual,
    capacidade: empresa.plano.capacidadeProfissionais,
    proposta,
    vagasDisponiveis: Math.max(0, empresa.plano.capacidadeProfissionais - proposta),
    acimaDoLimite: proposta > empresa.plano.capacidadeProfissionais,
    recepcionistasAtuais,
    recepcionistasPropostos,
    capacidadeRecepcionistas: empresa.plano.capacidadeRecepcionistas,
    recepcionistasAcimaDoLimite: recepcionistasPropostos > empresa.plano.capacidadeRecepcionistas,
  }
}

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
const chaveValida = (chave: string) => /^[a-zA-Z0-9_-]+$/.test(chave)

export function validarRascunho(empresa: EmpresaGestao, rascunho: RascunhoGestao) {
  const erros: string[] = []
  const ocupacao = calcularOcupacao(empresa, rascunho)
  if (ocupacao.acimaDoLimite) erros.push(`A proposta excede o limite de ${ocupacao.capacidade} profissionais.`)
  if (ocupacao.recepcionistasAcimaDoLimite) erros.push(`A proposta excede o limite de ${ocupacao.capacidadeRecepcionistas} recepcionistas.`)

  const idsProfissionais = new Set<string>()
  for (const op of rascunho.operacoesProfissionais) {
    if (op.profissionalExistenteId && idsProfissionais.has(op.profissionalExistenteId)) erros.push('Há mais de uma alteração para o mesmo profissional.')
    if (op.profissionalExistenteId) idsProfissionais.add(op.profissionalExistenteId)
    const dados = op.dadosNovos ?? op.dadosAtualizados
    if (dados) validarProfissional(dados, erros)
  }

  const idsRecepcionistas = new Set<string>()
  for (const op of rascunho.operacoesRecepcionistas) {
    if (op.recepcionistaExistenteId && idsRecepcionistas.has(op.recepcionistaExistenteId)) erros.push('Há mais de uma alteração para a mesma recepcionista.')
    if (op.recepcionistaExistenteId) idsRecepcionistas.add(op.recepcionistaExistenteId)
    const dados = op.dadosNovos ?? op.dadosAtualizados
    if (dados) validarRecepcionista(dados, erros)
  }

  const idsServicos = new Set<string>()
  for (const op of rascunho.operacoesServicos) {
    if (op.servicoExistenteId && idsServicos.has(op.servicoExistenteId)) erros.push('Há mais de uma alteração para o mesmo serviço.')
    if (op.servicoExistenteId) idsServicos.add(op.servicoExistenteId)
    const dados = op.dadosNovos ?? op.dadosAtualizados
    if (dados) validarServico(dados, erros)
  }

  return { valido: erros.length === 0, erros }
}

function validarProfissional(dados: DadosProfissionalNovo, erros: string[]) {
  if (!dados.nome.trim()) erros.push('Informe o nome de cada profissional.')
  if (!chaveValida(dados.chave)) erros.push(`Identificador inválido para ${dados.nome || 'profissional'}.`)
  if (dados.acessoPortal && !emailValido(dados.email ?? '')) erros.push(`Informe um e-mail válido para ${dados.nome || 'profissional'}.`)
  if (dados.horarios.some((h) => h.diaSemana < 0 || h.diaSemana > 6 || !h.horaInicio || !h.horaFim || h.horaFim <= h.horaInicio)) {
    erros.push(`Revise os horários de ${dados.nome || 'profissional'}.`)
  }
}

function validarRecepcionista(dados: DadosRecepcionista, erros: string[]) {
  if (!dados.nome.trim()) erros.push('Informe o nome de cada recepcionista.')
  if (!chaveValida(dados.chave)) erros.push(`Identificador inválido para ${dados.nome || 'recepcionista'}.`)
  if (!emailValido(dados.email)) erros.push(`Informe um e-mail válido para ${dados.nome || 'recepcionista'}.`)
}

function validarServico(dados: DadosServicoNovo, erros: string[]) {
  if (!dados.nome.trim()) erros.push('Informe o nome de cada serviço.')
  if (!chaveValida(dados.chave)) erros.push(`Identificador inválido para ${dados.nome || 'serviço'}.`)
  if (!Number.isFinite(dados.duracaoMin) || dados.duracaoMin <= 0) erros.push(`Duração inválida para ${dados.nome || 'serviço'}.`)
  if (!Number.isFinite(dados.preco) || dados.preco < 0) erros.push(`Valor inválido para ${dados.nome || 'serviço'}.`)
}

const profissionalJson = (dados: DadosProfissionalNovo): JsonProfissional => ({
  usuario_id: dados.usuarioId,
  chave: dados.chave, nome: dados.nome, telefone: dados.telefone ?? null,
  email: dados.email ?? null, acesso_portal: dados.acessoPortal,
  cor_agenda: dados.corAgenda ?? '#6B7280', ativo: dados.ativo,
})
const recepcionistaJson = (dados: DadosRecepcionista): JsonRecepcionista => ({
  chave: dados.chave, nome: dados.nome, email: dados.email,
  telefone: dados.telefone ?? null, ativo: dados.ativo,
})
const servicoJson = (dados: DadosServicoNovo): JsonServico => ({
  chave: dados.chave, nome: dados.nome, descricao: dados.descricao ?? null,
  duracao_min: dados.duracaoMin, preco: dados.preco,
  prazo_reativacao_dias: dados.prazoReativacaoDias ?? 30,
  requer_avaliacao: dados.requerAvaliacao, ativo: dados.ativo,
  ordem_exibicao: dados.ordemExibicao,
})
const horariosJson = (dados: DadosProfissionalNovo): JsonHorario[] => dados.horarios.map((h) => ({
  dia_semana: h.diaSemana, inicio: h.horaInicio, fim: h.horaFim, ativo: h.ativo,
}))

export function gerarJsonSolicitacao(empresa: EmpresaGestao, rascunho: RascunhoGestao, solicitacaoIdExistente?: string): JsonAlteracaoEquipe {
  const ocupacao = calcularOcupacao(empresa, rascunho)
  return {
    versao: 'gestao-empresa/2.0',
    tipo: 'ALTERACAO_EMPRESA_EXISTENTE',
    solicitacao_id: solicitacaoIdExistente ?? gerarSolicitacaoId(),
    solicitado_em: new Date().toISOString(),
    empresa: { id: empresa.id, codigo: empresa.codigo, nome_fantasia: empresa.nomeFantasia },
    admin: { nome: empresa.admin?.nome ?? '', email: empresa.admin?.email ?? '' },
    plano_codigo: empresa.plano.codigo,
    ocupacao_informativa: { atual: ocupacao.atual, limite_contratado: ocupacao.capacidade, proposta: ocupacao.proposta },
    operacoes: {
      profissionais: rascunho.operacoesProfissionais.map((op) => {
        const dados = op.dadosNovos ?? op.dadosAtualizados
        return {
          acao: op.tipo === 'inclusao' ? 'incluir' : op.tipo === 'edicao' ? 'editar' : 'remover',
          id: op.profissionalExistenteId ?? null,
          chave: dados?.chave ?? op.chave ?? `prof-${op.profissionalExistenteId?.slice(0, 8) ?? 'novo'}`,
          dados: dados ? profissionalJson(dados) : null,
          servico_ids: dados?.servicoIds ?? [],
          horarios: dados ? horariosJson(dados) : [],
        }
      }),
      recepcionistas: rascunho.operacoesRecepcionistas.map((op) => {
        const dados = op.dadosNovos ?? op.dadosAtualizados
        return {
          acao: op.tipo === 'inclusao' ? 'incluir' : op.tipo === 'edicao' ? 'editar' : 'remover',
          id: op.recepcionistaExistenteId ?? null,
          chave: dados?.chave ?? op.chave ?? `recep-${op.recepcionistaExistenteId?.slice(0, 8) ?? 'novo'}`,
          dados: dados ? recepcionistaJson(dados) : null,
        }
      }),
      servicos: rascunho.operacoesServicos.map((op) => {
        const dados = op.dadosNovos ?? op.dadosAtualizados
        return {
          acao: op.tipo === 'adicao' ? 'incluir' : op.tipo === 'edicao' ? 'editar' : 'remover',
          id: op.servicoExistenteId ?? null,
          chave: dados?.chave ?? op.chave ?? `srv-${op.servicoExistenteId?.slice(0, 8) ?? 'novo'}`,
          dados: dados ? servicoJson(dados) : null,
        }
      }),
    },
  }
}

function gerarSolicitacaoId(): string {
  return crypto.randomUUID?.() ?? `sol-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
