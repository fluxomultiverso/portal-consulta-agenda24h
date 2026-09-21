// ============================================================================
// Tipos internos do portal (interface)
// ============================================================================

export interface ProfissionalGestao {
  id: string
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
}

export interface EmpresaGestao {
  id: string
  codigo: string
  nomeFantasia: string
  admin?: { nome: string; email: string }
  plano: PlanoEmpresa
  profissionais: ProfissionalGestao[]
  servicos: ServicoGestao[]
}

// ============================================================================
// Operações de rascunho
// ============================================================================

export type TipoOperacaoProfissional = 'inclusao' | 'remocao' | 'substituicao'

export interface OperacaoProfissional {
  tipo: TipoOperacaoProfissional
  profissionalExistenteId?: string
  chave?: string
  dadosNovos?: DadosProfissionalNovo
  dadosSubstituto?: DadosProfissionalNovo
}

export interface DadosProfissionalNovo {
  chave: string
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
  tipo: 'adicao' | 'remocao' | 'desvincular'
  servicoExistenteId?: string
  chave?: string
  dadosNovos?: DadosServicoNovo
  profissionalIdsAfetados?: string[]
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
}

// ============================================================================
// Contrato JSON V2 de alteração de equipe
// ============================================================================

export interface JsonAlteracaoEquipe {
  versao: 'alteracao-equipe/1.0'
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
  referencias_existentes: {
    profissionais: Array<{ chave: string; id: string }>
    servicos: Array<{ chave: string; id: string }>
  }
  profissionais: JsonProfissional[]
  servicos: JsonServico[]
  profissional_servicos: JsonVinculo[]
  horarios_profissionais: JsonHorario[]
  alteracoes: {
    profissionais_incluir: string[]
    profissionais_remover: string[]
    profissionais_substituir: Array<{
      profissional_antigo_chave: string
      profissional_novo_chave: string
    }>
    servicos_incluir: string[]
    servicos_remover: string[]
    vinculos_desvincular: Array<{
      profissional_chave: string
      servico_chave: string
    }>
  }
}

export interface JsonProfissional {
  chave: string
  nome: string
  telefone: string | null
  email: string | null
  acesso_portal: boolean
  cor_agenda: string
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

export interface JsonVinculo {
  profissional_chave: string
  servico_chave: string
  ativo: boolean
}

export interface JsonHorario {
  profissional_chave: string
  dia_semana: number
  inicio: string
  fim: string
  ativo: boolean
}
