import { subDays, format } from 'date-fns'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  Atendimento,
  Automacao,
  DadosGrafico,
  Indicadores,
  OrigemAgendamento,
  Profissional,
  RelatorioSemanal,
  SituacaoAtendimento,
} from '@/types'

type JsonObject = Record<string, unknown>

function exigirConfiguracao() {
  if (!isSupabaseConfigured()) throw new Error('A conexão com o Supabase não está configurada.')
}

function objeto(value: unknown): JsonObject {
  return value && typeof value === 'object' ? value as JsonObject : {}
}

function numero(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapearAtendimento(value: unknown): Atendimento {
  const row = objeto(value)
  const status = String(row.status)
  const situacao: SituacaoAtendimento = status === 'concluido'
    ? 'atendimento_concluido'
    : status === 'faltou'
      ? 'cliente_faltou'
      : status === 'cancelado'
        ? 'cancelado'
        : 'confirmado'

  return {
    id: String(row.id),
    profissionalId: String(row.profissional_id),
    clienteId: String(row.cliente_id),
    servicoId: String(row.servico_id),
    dataHora: String(row.inicio_em),
    situacao,
    origem: String(row.origem) as OrigemAgendamento,
    observacoes: typeof row.observacoes_cliente === 'string' ? row.observacoes_cliente : undefined,
    concluidoEm: typeof row.concluido_em === 'string' ? row.concluido_em : null,
    faltouEm: typeof row.faltou_em === 'string' ? row.faltou_em : null,
    atualizadoEm: typeof row.atualizado_em === 'string' ? row.atualizado_em : null,
    clienteNome: typeof row.cliente_nome === 'string' && row.cliente_nome.trim() ? row.cliente_nome : 'Cliente sem nome',
    profissionalNome: String(row.profissional_nome ?? 'Não informado'),
    servicoNome: String(row.servico_nome ?? 'Não informado'),
    duracaoMinutos: numero(row.duracao_min),
    preco: numero(row.preco),
  }
}

async function rpc<T>(nome: string, parametros?: Record<string, unknown>): Promise<T> {
  exigirConfiguracao()
  const { data, error } = await supabase.rpc(nome, parametros)
  if (error) throw new Error(error.message)
  return data as T
}

export const api = {
  async getProfissionais(): Promise<Profissional[]> {
    const data = await rpc<unknown[]>('consultar_profissionais_portal')
    return (data ?? []).map((item) => {
      const row = objeto(item)
      return { id: String(row.id), nome: String(row.nome), cor: typeof row.cor_agenda === 'string' ? row.cor_agenda : undefined }
    })
  },

  async getAtendimentos(data: string, profissionalId?: string): Promise<Atendimento[]> {
    const result = await rpc<unknown[]>('consultar_agenda_portal', {
      p_data: data,
      p_profissional_id: profissionalId ?? null,
    })
    return (result ?? []).map(mapearAtendimento)
  },

  async getAtendimentoById(id: string): Promise<Atendimento | undefined> {
    const result = await rpc<unknown[]>('consultar_atendimento_portal', { p_agendamento_id: id })
    return result?.[0] ? mapearAtendimento(result[0]) : undefined
  },

  async getIndicadores(empresaId: string, dias: number = 30): Promise<Indicadores> {
    const fim = new Date()
    const inicio = subDays(fim, Math.max(1, dias) - 1)
    const data = objeto(await rpc('consultar_indicadores_portal', {
      p_empresa_id: empresaId,
      p_inicio: format(inicio, 'yyyy-MM-dd'),
      p_fim: format(fim, 'yyyy-MM-dd'),
    }))
    const agenda = objeto(data.agenda)
    const automacoes = objeto(data.automacoes)
    return {
      agendamentosCriados: numero(agenda.agendamentos_criados),
      clientesQueAgendaram: numero(agenda.clientes_agendaram),
      taxaComparecimento: numero(agenda.taxa_comparecimento),
      reativacoesConvertidas: numero(automacoes.reativacoes_convertidas),
      valorAtendimentosConcluidos: numero(agenda.valor_concluidos),
      valorReativacoes: numero(automacoes.valor_reativacoes),
    }
  },

  async getDadosGrafico(empresaId: string, dias: number = 7): Promise<DadosGrafico[]> {
    const fim = new Date()
    const inicio = subDays(fim, Math.max(1, dias) - 1)
    const data = objeto(await rpc('consultar_indicadores_portal', {
      p_empresa_id: empresaId,
      p_inicio: format(inicio, 'yyyy-MM-dd'),
      p_fim: format(fim, 'yyyy-MM-dd'),
    }))
    return (Array.isArray(data.serie_diaria) ? data.serie_diaria : []).map((item) => {
      const row = objeto(item)
      return {
        data: String(row.data),
        agendamentos: numero(row.agendamentos_criados),
        concluidos: numero(row.atendimentos_concluidos),
      }
    })
  },

  async getRelatorios(): Promise<RelatorioSemanal[]> {
    const data = await rpc<unknown[]>('consultar_relatorios_portal')
    return (data ?? []).map((item) => {
      const row = objeto(item)
      return {
        semanaInicio: String(row.semana_inicio),
        semanaFim: String(row.semana_fim),
        agendamentosCriados: numero(row.agendamentos_criados),
        clientesQueAgendaram: numero(row.clientes_agendaram),
        atendimentosConcluidos: numero(row.atendimentos_concluidos),
        faltas: numero(row.faltas),
        lembretesEnviados: numero(row.lembretes_enviados),
        reativacoesEnviadas: numero(row.reativacoes_enviadas),
        agendamentosReativacoes: numero(row.reativacoes_convertidas),
        concluidosReativacoes: numero(row.reativacoes_concluidas),
        valorConcluidos: numero(row.faturamento_agendamentos),
        valorReativacoes: numero(row.faturamento_reativacoes),
        mensalidade: numero(row.custo_mensal_referencia),
      }
    })
  },

  async getAutomacoes(): Promise<Automacao[]> {
    const data = await rpc<unknown[]>('consultar_automacoes_portal')
    return (data ?? []).map((item) => {
      const row = objeto(item)
      return {
        id: String(row.tipo),
        tipo: String(row.nome),
        status: String(row.status) as Automacao['status'],
        ultimaExecucao: typeof row.ultima_execucao === 'string' ? row.ultima_execucao : undefined,
        proximaExecucao: typeof row.proxima_execucao === 'string' ? row.proxima_execucao : undefined,
        quantidadeItens: numero(row.quantidade_itens),
        descricao: String(row.descricao ?? ''),
      }
    })
  },

  formatarSituacao(situacao: SituacaoAtendimento): string {
    return ({
      confirmado: 'Confirmado',
      atendimento_concluido: 'Atendimento concluído',
      cliente_faltou: 'Cliente faltou',
      cancelado: 'Cancelado',
      resultado_pendente: 'Resultado pendente',
    } as Record<SituacaoAtendimento, string>)[situacao]
  },

  formatarOrigem(origem: OrigemAgendamento): string {
    return ({
      cliente_whatsapp: 'WhatsApp',
      portal: 'Portal',
      administrador: 'Administrador',
      sistema: 'Sistema',
    } as Record<OrigemAgendamento, string>)[origem] ?? origem
  },
}
