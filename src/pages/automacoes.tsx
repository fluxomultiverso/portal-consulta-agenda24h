import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Play,
} from 'lucide-react'
import { api } from '@/services/api'
import type { Automacao } from '@/types'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const statusConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string; bgClass: string }
> = {
  concluida: {
    label: 'Concluída',
    icon: CheckCircle2,
    className: 'text-success-600',
    bgClass: 'bg-success-50 border-success-500/20',
  },
  processando: {
    label: 'Em processamento',
    icon: Loader2,
    className: 'text-primary-600',
    bgClass: 'bg-primary-50 border-primary-200',
  },
  pendente: {
    label: 'Pendente',
    icon: Clock,
    className: 'text-muted-foreground',
    bgClass: 'bg-muted border-border',
  },
  falha: {
    label: 'Falha',
    icon: AlertTriangle,
    className: 'text-danger-600',
    bgClass: 'bg-danger-50 border-danger-500/20',
  },
}

export function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const dados = await api.getAutomacoes()
        setAutomacoes(dados)
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar as automações.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  if (loading) return <LoadingState message="Carregando automações..." />
  if (erro) return <ErrorState title="Não foi possível carregar as automações" description={erro} />
  if (automacoes.length === 0) {
    return <EmptyState title="Nenhuma automação configurada" />
  }

  const pendentes = automacoes.filter((a) => a.status === 'pendente')
  const processando = automacoes.filter((a) => a.status === 'processando')
  const concluidas = automacoes.filter((a) => a.status === 'concluida')
  const falhas = automacoes.filter((a) => a.status === 'falha')

  const proxima = automacoes
    .filter((a) => a.proximaExecucao && a.status !== 'falha')
    .sort(
      (a, b) =>
        new Date(a.proximaExecucao!).getTime() -
        new Date(b.proximaExecucao!).getTime()
    )[0]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Automações</h2>
        <p className="text-sm text-muted-foreground">
          Status das automações do sistema
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <ResumoCard label="Concluídas" valor={concluidas.length} cor="success" />
        <ResumoCard label="Em processamento" valor={processando.length} cor="primary" />
        <ResumoCard label="Pendentes" valor={pendentes.length} cor="muted" />
        <ResumoCard label="Falhas ativas" valor={falhas.length} cor="danger" />
      </div>

      {/* Próxima automação */}
      {proxima && (
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary-50 p-2">
            <Play className="size-4 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Próxima automação
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {proxima.tipo}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(proxima.proximaExecucao!), "d 'de' MMM 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {automacoes.map((aut) => {
          const config = statusConfig[aut.status] ?? statusConfig.pendente
          const Icon = config.icon

          return (
            <div
              key={aut.id}
              className={cn('rounded-xl border p-4 space-y-2', config.bgClass)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      config.className,
                      aut.status === 'processando' && 'animate-spin'
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {aut.tipo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {aut.descricao}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    config.className
                  )}
                >
                  {config.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {aut.ultimaExecucao && (
                  <span>
                    Última:{' '}
                    {format(parseISO(aut.ultimaExecucao), "dd/MM 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                )}
                {aut.quantidadeItens && (
                  <span>{aut.quantidadeItens} itens</span>
                )}
              </div>

              {aut.status === 'falha' && (
                <div className="rounded-lg bg-white/60 border border-danger-500/20 p-2.5">
                  <p className="text-xs text-danger-600">
                    Esta automação encontrou um erro. Entre em contato com o
                    suporte para verificar.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResumoCard({
  label,
  valor,
  cor,
}: {
  label: string
  valor: number
  cor: 'success' | 'primary' | 'muted' | 'danger'
}) {
  const corMap = {
    success: 'bg-success-50 text-success-600',
    primary: 'bg-primary-50 text-primary-600',
    muted: 'bg-muted text-muted-foreground',
    danger: 'bg-danger-50 text-danger-600',
  }

  return (
    <div className="rounded-xl border bg-white p-3 flex items-center gap-3">
      <div
        className={cn('rounded-lg p-2 text-lg font-bold', corMap[cor])}
      >
        {valor}
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
