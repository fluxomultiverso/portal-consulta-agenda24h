import { useState, useEffect } from 'react'
import {
  CalendarPlus,
  Users,
  TrendingUp,
  RefreshCw,
  DollarSign,
  Sparkles,
} from 'lucide-react'
import { api } from '@/services/api'
import type { Automacao, DadosGrafico, Indicadores } from '@/types'
import { IndicadorCard } from '@/components/metricas/indicador-card'
import { SeletorPeriodo, type Periodo } from '@/components/metricas/seletor-periodo'
import { GraficoEvolucao } from '@/components/metricas/grafico-evolucao'
import { ResumoAutomacoes } from '@/components/metricas/resumo-automacoes'
import { ErrorState, LoadingState } from '@/components/ui/state'
import { useAuth } from '@/hooks/use-auth'

export function VisaoGeralPage() {
  const { usuario } = useAuth()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [grafico, setGrafico] = useState<DadosGrafico[]>([])
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const dias = periodo === 'hoje' ? 1 : periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
        if (!usuario?.empresaId) throw new Error('Empresa do usuário não identificada.')
        const [ind, graf, aut] = await Promise.all([
          api.getIndicadores(usuario.empresaId, dias),
          api.getDadosGrafico(usuario.empresaId, dias),
          api.getAutomacoes(),
        ])
        setIndicadores(ind)
        setGrafico(graf)
        setAutomacoes(aut)
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar os indicadores.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [periodo, usuario?.empresaId])

  if (loading || !indicadores) {
    if (erro) return <ErrorState title="Não foi possível carregar a visão geral" description={erro} />
    return <LoadingState message="Carregando indicadores..." />
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Visão geral</h2>
        <p className="text-sm text-muted-foreground">
          Métricas de desempenho do período
        </p>
      </div>

      <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />

      <div className="grid grid-cols-2 gap-3">
        <IndicadorCard
          titulo="Agendamentos"
          valor={indicadores.agendamentosCriados}
          icone={<CalendarPlus className="size-4" />}
        />
        <IndicadorCard
          titulo="Clientes"
          valor={indicadores.clientesQueAgendaram}
          icone={<Users className="size-4" />}
        />
        <IndicadorCard
          titulo="Comparecimento"
          valor={`${indicadores.taxaComparecimento}%`}
          icone={<TrendingUp className="size-4" />}
        />
        <IndicadorCard
          titulo="Reativações"
          valor={indicadores.reativacoesConvertidas}
          icone={<RefreshCw className="size-4" />}
          destaque
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <IndicadorCard
          titulo="Atendimentos concluídos"
          valor={`R$ ${indicadores.valorAtendimentosConcluidos.toFixed(2)}`}
          icone={<DollarSign className="size-4" />}
          descricao="Valor registrado na agenda (não confirma pagamento)"
        />
        <IndicadorCard
          titulo="Valor das reativações"
          valor={`R$ ${indicadores.valorReativacoes.toFixed(2)}`}
          icone={<Sparkles className="size-4" />}
          descricao="Valor dos agendamentos vindos de reativações"
          destaque
        />
      </div>

      <GraficoEvolucao dados={grafico} />

      <ResumoAutomacoes automacoes={automacoes} />
    </div>
  )
}
