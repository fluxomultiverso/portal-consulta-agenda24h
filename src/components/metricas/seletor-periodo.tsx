import { cn } from '@/lib/utils'

type Periodo = 'hoje' | '7d' | '30d' | '90d'

interface SeletorPeriodoProps {
  periodo: Periodo
  onChange: (periodo: Periodo) => void
}

const opcoes: { value: Periodo; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
]

export function SeletorPeriodo({ periodo, onChange }: SeletorPeriodoProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      {opcoes.map((op) => (
        <button
          key={op.value}
          type="button"
          onClick={() => onChange(op.value)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            periodo === op.value
              ? 'bg-primary-600 text-white'
              : 'bg-white border text-foreground hover:bg-muted'
          )}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}

export type { Periodo }
