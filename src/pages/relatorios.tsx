import { useState, useEffect } from 'react'
import {
  CalendarPlus,
  Users,
  CheckCircle2,
  XCircle,
  Bell,
  RefreshCw,
  DollarSign,
  CreditCard,
} from 'lucide-react'
import { api } from '@/services/api'
import type { RelatorioSemanal } from '@/types'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<RelatorioSemanal[]>([])
  const [loading, setLoading] = useState(true)
  const [semanaAtiva, setSemanaAtiva] = useState(0)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const dados = await api.getRelatorios()
        setRelatorios(dados)
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar os relatórios.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  if (loading) return <LoadingState message="Carregando relatórios..." />
  if (erro) return <ErrorState title="Não foi possível carregar os relatórios" description={erro} />
  if (relatorios.length === 0) {
    return <EmptyState title="Nenhum relatório disponível" />
  }

  const rel = relatorios[semanaAtiva]
  const periodo = `${format(parseISO(rel.semanaInicio), "d 'de' MMM", { locale: ptBR })} a ${format(parseISO(rel.semanaFim), "d 'de' MMM", { locale: ptBR })}`

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Relatórios</h2>
        <p className="text-sm text-muted-foreground">
          Relatórios semanais de desempenho
        </p>
      </div>

      {/* Seletor de semana */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {relatorios.map((r, i) => (
          <button
            key={r.semanaInicio}
            type="button"
            onClick={() => setSemanaAtiva(i)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              semanaAtiva === i
                ? 'bg-primary-600 text-white'
                : 'bg-white border text-foreground hover:bg-muted'
            }`}
          >
            {format(parseISO(r.semanaInicio), 'dd/MM', { locale: ptBR })}
          </button>
        ))}
      </div>

      {/* Período */}
      <div className="rounded-lg bg-muted/50 border px-3 py-2 text-sm text-muted-foreground">
        Semana de {periodo}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <RelatorioItem
          label="Agendamentos criados"
          valor={rel.agendamentosCriados}
          icone={<CalendarPlus className="size-4" />}
        />
        <RelatorioItem
          label="Clientes que agendaram"
          valor={rel.clientesQueAgendaram}
          icone={<Users className="size-4" />}
        />
        <RelatorioItem
          label="Atendimentos concluídos"
          valor={rel.atendimentosConcluidos}
          icone={<CheckCircle2 className="size-4" />}
          cor="success"
        />
        <RelatorioItem
          label="Faltas"
          valor={rel.faltas}
          icone={<XCircle className="size-4" />}
          cor="danger"
        />
        <RelatorioItem
          label="Lembretes enviados"
          valor={rel.lembretesEnviados}
          icone={<Bell className="size-4" />}
        />
        <RelatorioItem
          label="Reativações enviadas"
          valor={rel.reativacoesEnviadas}
          icone={<RefreshCw className="size-4" />}
        />
        <RelatorioItem
          label="Agendamentos por reativação"
          valor={rel.agendamentosReativacoes}
          icone={<RefreshCw className="size-4" />}
        />
        <RelatorioItem
          label="Concluídos por reativação"
          valor={rel.concluidosReativacoes}
          icone={<CheckCircle2 className="size-4" />}
          cor="success"
        />
      </div>

      {/* Valores */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Valores do período
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="size-4" />
              Atendimentos concluídos
            </span>
            <span className="text-sm font-semibold text-foreground">
              R$ {rel.valorConcluidos.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="size-4" />
              Valor associado às reativações
            </span>
            <span className="text-sm font-medium text-primary-600">
              R$ {rel.valorReativacoes.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="size-4" />
              Mensalidade de referência
            </span>
            <span className="text-sm font-semibold text-foreground">
              R$ {rel.mensalidade.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-foreground">
              Resultado vs. mensalidade
            </span>
            <span
              className={`text-sm font-bold ${
                rel.valorConcluidos >= rel.mensalidade
                  ? 'text-success-600'
                  : 'text-danger-600'
              }`}
            >
              {rel.valorConcluidos >= rel.mensalidade ? '+' : ''}
              R$ {(rel.valorConcluidos - rel.mensalidade).toFixed(2)}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          O valor das reativações já está incluído no total de atendimentos concluídos.
        </p>
      </div>
    </div>
  )
}

function RelatorioItem({
  label,
  valor,
  icone,
  cor,
}: {
  label: string
  valor: number
  icone: React.ReactNode
  cor?: 'success' | 'danger'
}) {
  return (
    <div className="rounded-xl border bg-white p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-lg p-1.5 ${
            cor === 'success'
              ? 'bg-success-50 text-success-600'
              : cor === 'danger'
                ? 'bg-danger-50 text-danger-600'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {icone}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{valor}</p>
    </div>
  )
}
