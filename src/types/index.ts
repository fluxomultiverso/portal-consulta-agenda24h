export type PerfilAcesso = 'administrador' | 'profissional' | 'recepcionista'

export type SituacaoAtendimento =
  | 'confirmado'
  | 'atendimento_concluido'
  | 'cliente_faltou'
  | 'cancelado'
  | 'resultado_pendente'

export type StatusAgendamento = 'confirmado' | 'cancelado' | 'concluido' | 'faltou'

export type OrigemAgendamento =
  | 'cliente_whatsapp'
  | 'portal'
  | 'administrador'
  | 'sistema'

export interface Profissional {
  id: string
  nome: string
  especialidade?: string
  cor?: string
}

export interface Servico {
  id: string
  nome: string
  duracaoMinutos: number
  preco: number
}

export interface Cliente {
  id: string
  nome: string
  telefone?: string
}

export interface Atendimento {
  id: string
  profissionalId: string
  clienteId: string
  servicoId: string
  dataHora: string
  situacao: SituacaoAtendimento
  origem: OrigemAgendamento
  observacoes?: string
  concluidoEm?: string | null
  faltouEm?: string | null
  atualizadoEm?: string | null
  clienteNome: string
  profissionalNome: string
  servicoNome: string
  duracaoMinutos: number
  preco: number
}

export interface AgendamentoSupabase {
  id: string
  empresa_id: string
  profissional_id: string
  cliente_id: string
  servico_id: string
  data_hora: string
  duracao_minutos: number
  status: StatusAgendamento
  origem: OrigemAgendamento
  status_presenca?: string | null
  concluido_em?: string | null
  faltou_em?: string | null
  atualizado_em?: string | null
  criado_em?: string | null
}

export interface Empresa {
  id: string
  nome: string
}

export interface Usuario {
  id: string
  nome: string
  perfil: PerfilAcesso
  empresaId: string
  profissionalId?: string
}

export interface Indicadores {
  agendamentosCriados: number
  clientesQueAgendaram: number
  taxaComparecimento: number
  reativacoesConvertidas: number
  valorAtendimentosConcluidos: number
  valorReativacoes: number
}

export interface DadosGrafico {
  data: string
  agendamentos: number
  concluidos: number
}

export interface RelatorioSemanal {
  semanaInicio: string
  semanaFim: string
  agendamentosCriados: number
  clientesQueAgendaram: number
  atendimentosConcluidos: number
  faltas: number
  lembretesEnviados: number
  reativacoesEnviadas: number
  agendamentosReativacoes: number
  concluidosReativacoes: number
  valorConcluidos: number
  valorReativacoes: number
  mensalidade: number
}

export type StatusAutomacao =
  | 'pendente'
  | 'processando'
  | 'concluida'
  | 'falha'

export interface Automacao {
  id: string
  tipo: string
  status: StatusAutomacao
  ultimaExecucao?: string
  proximaExecucao?: string
  quantidadeItens?: number
  descricao: string
}

export type RespostaComparecimento = 'sim' | 'nao'
