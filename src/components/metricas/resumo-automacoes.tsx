import type { Automacao } from '@/types'
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResumoAutomacoesProps {
  automacoes: Automacao[]
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  concluida: {
    label: 'Concluída',
    icon: CheckCircle2,
    className: 'text-success-600 bg-success-50',
  },
  processando: {
    label: 'Processando',
    icon: Loader2,
    className: 'text-primary-600 bg-primary-50',
  },
  pendente: {
    label: 'Pendente',
    icon: Clock,
    className: 'text-muted-foreground bg-muted',
  },
  falha: {
    label: 'Falha',
    icon: AlertTriangle,
    className: 'text-danger-600 bg-danger-50',
  },
}

export function ResumoAutomacoes({ automacoes }: ResumoAutomacoesProps) {
  const falhas = automacoes.filter((a) => a.status === 'falha')

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Automações
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {automacoes.map((aut) => {
          const config = statusConfig[aut.status] ?? statusConfig.pendente
          const Icon = config.icon

          return (
            <div
              key={aut.id}
              className="flex items-center gap-2 rounded-lg border p-2.5"
            >
              <div className={cn('rounded-lg p-1.5', config.className)}>
                <Icon className={cn('size-3.5', aut.status === 'processando' && 'animate-spin')} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {aut.tipo}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {config.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {falhas.length > 0 && (
        <div className="rounded-lg bg-danger-50 border border-danger-500/20 p-3">
          <p className="text-xs text-danger-600">
            {falhas.length} automação(ões) com falha. Entre em contato com o suporte para verificar.
          </p>
        </div>
      )}
    </div>
  )
}
