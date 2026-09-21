import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface IndicadorCardProps {
  titulo: string
  valor: string | number
  icone: ReactNode
  descricao?: string
  destaque?: boolean
}

export function IndicadorCard({
  titulo,
  valor,
  icone,
  descricao,
  destaque = false,
}: IndicadorCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 space-y-2',
        destaque && 'border-primary-200 bg-primary-50/30'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {titulo}
        </span>
        <div
          className={cn(
            'rounded-lg p-1.5',
            destaque ? 'bg-primary-100 text-primary-600' : 'bg-muted text-muted-foreground'
          )}
        >
          {icone}
        </div>
      </div>
      <p
        className={cn(
          'text-2xl font-bold',
          destaque ? 'text-primary-700' : 'text-foreground'
        )}
      >
        {valor}
      </p>
      {descricao && (
        <p className="text-xs text-muted-foreground">{descricao}</p>
      )}
    </div>
  )
}
