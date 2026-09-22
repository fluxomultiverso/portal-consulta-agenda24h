// ============================================================================
// Tipos internos do portal (interface)
// ============================================================================

export interface ProfissionalGestao {
  id: string
  usuarioId?: string
  nome: string
  email?: string
  telefone?: string
  ativo: boolean
  acessoPortal: boolean
  corAgenda?: string
  servicoIds: string[]
  horarios: HorarioTrabalho[]
  criadoEm?: string
  atualizadoEm?: string
}

export interface RecepcionistaGestao {
  id: string
  usuarioId: string
  nome: string
  email: string
  telefone?: string
  ativo: boolean
  criadoEm?: string
  atualizadoEm?: string
}

export interface ServicoGestao {
  id: string
  nome: string
  descricao?: string
  duracaoMinutos: number
  preco: number
  prazoReativacaoDias?: number
  requerAvaliacao: boolean
  ordemExibicao?: number
  ativo: boolean
  criadoEm?: string
}

export interface HorarioTrabalho {
  diaSemana: number
  horaInicio: string
  horaFim: string
  ativo: boolean
}

export interface PlanoEmpresa {
  codigo: string
  nome: string
  capacidadeProfissionais: number
  capacidadeRecepcionistas: number
}

export interface EmpresaGestao {
  id: string
  codigo: string
  nomeFantasia: string
  admin?: { nome: string; email: string }
  plano: PlanoEmpresa
  profissionais: ProfissionalGestao[]
  recepcionistas: RecepcionistaGestao[]
  servicos: ServicoGestao[]
}

// ============================================================================
// Operações de rascunho
// ============================================================================

export type TipoOperacaoProfissional = 'inclusao' | 'edicao' | 'remocao'

export interface OperacaoProfissional {
  tipo: TipoOperacaoProfissional
  profissionalExistenteId?: string
  chave?: string
  dadosNovos?: DadosProfissionalNovo
  dadosAtualizados?: DadosProfissionalNovo
}

export interface OperacaoRecepcionista {
  tipo: 'inclusao' | 'edicao' | 'remocao'
  recepcionistaExistenteId?: string
  chave?: string
  dadosNovos?: DadosRecepcionista
  dadosAtualizados?: DadosRecepcionista
}

export interface DadosRecepcionista {
  chave: string
  nome: string
  email: string
  telefone?: string
  ativo: boolean
}

export interface DadosProfissionalNovo {
  chave: string
  usuarioId?: string
  nome: string
  telefone?: string
  email?: string
  acessoPortal: boolean
  corAgenda?: string
  ativo: boolean
  servicoIds: string[]
  horarios: HorarioTrabalho[]
}

export interface OperacaoServico {
  tipo: 'adicao' | 'edicao' | 'remocao'
  servicoExistenteId?: string
  chave?: string
  dadosNovos?: DadosServicoNovo
  dadosAtualizados?: DadosServicoNovo
}

export interface DadosServicoNovo {
  chave: string
  nome: string
  descricao?: string
  duracaoMin: number
  preco: number
  prazoReativacaoDias?: number
  requerAvaliacao: boolean
  ativo: boolean
  ordemExibicao: number
}

export interface RascunhoGestao {
  operacoesProfissionais: OperacaoProfissional[]
  operacoesRecepcionistas: OperacaoRecepcionista[]
  operacoesServicos: OperacaoServico[]
  criadoEm: string
  solicitacaoId?: string
}

export interface ResumoOcupacao {
  atual: number
  capacidade: number
  proposta: number
  vagasDisponiveis: number
  acimaDoLimite: boolean
  recepcionistasAtuais: number
  recepcionistasPropostos: number
  capacidadeRecepcionistas: number
  recepcionistasAcimaDoLimite: boolean
}

// ============================================================================
// Contrato JSON V2 de alteração de equipe
// ============================================================================

export interface JsonAlteracaoEquipe {
  versao: 'gestao-empresa/2.0'
  tipo: 'ALTERACAO_EMPRESA_EXISTENTE'
  solicitacao_id: string
  solicitado_em: string
  empresa: {
    id: string
    codigo: string
    nome_fantasia: string
  }
  admin: {
    nome: string
    email: string
  }
  plano_codigo: string
  ocupacao_informativa: {
    atual: number
    limite_contratado: number
    proposta: number
  }
  operacoes: {
    profissionais: Array<{
      acao: 'incluir' | 'editar' | 'remover'
      id: string | null
      chave: string
      dados: JsonProfissional | null
      servico_ids: string[]
      horarios: JsonHorario[]
    }>
    recepcionistas: Array<{
      acao: 'incluir' | 'editar' | 'remover'
      id: string | null
      chave: string
      dados: JsonRecepcionista | null
    }>
    servicos: Array<{
      acao: 'incluir' | 'editar' | 'remover'
      id: string | null
      chave: string
      dados: JsonServico | null
    }>
  }
}

export interface JsonProfissional {
  usuario_id?: string
  chave: string
  nome: string
  telefone: string | null
  email: string | null
  acesso_portal: boolean
  cor_agenda: string
  ativo: boolean
}

export interface JsonRecepcionista {
  usuario_id?: string
  chave: string
  nome: string
  email: string
  telefone: string | null
  ativo: boolean
}

export interface JsonServico {
  chave: string
  nome: string
  descricao: string | null
  duracao_min: number
  preco: number
  prazo_reativacao_dias: number
  requer_avaliacao: boolean
  ativo: boolean
  ordem_exibicao: number
}

export interface JsonHorario {
  dia_semana: number
  inicio: string
  fim: string
  ativo: boolean
}
