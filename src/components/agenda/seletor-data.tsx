import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface SeletorDataProps {
  data: Date
  onChange: (data: Date) => void
}

export function SeletorData({ data, onChange }: SeletorDataProps) {
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(data)
    d.setDate(d.getDate() - 3 + i)
    return d
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(subDays(data, 1))}
          aria-label="Dia anterior"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {isToday(data) ? 'Hoje' : ''}{' '}
            {format(data, "d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(addDays(data, 1))}
          aria-label="Próximo dia"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {dias.map((d) => {
          const diaSemana = format(d, 'EEE', { locale: ptBR })
          const diaNumero = format(d, 'd')
          const selecionado = isSameDay(d, data)
          const hoje = isToday(d)

          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onChange(d)}
              className={cn(
                'flex flex-col items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors min-w-[48px] shrink-0',
                selecionado
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border text-foreground hover:bg-muted',
                hoje && !selecionado && 'border-primary-300'
              )}
            >
              <span className={cn('uppercase', selecionado ? 'text-primary-100' : 'text-muted-foreground')}>
                {diaSemana}
              </span>
              <span className="text-base font-semibold mt-0.5">{diaNumero}</span>
            </button>
          )
        })}
      </div>

      {!isToday(data) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(new Date())}
          className="w-full"
        >
          Voltar para hoje
        </Button>
      )}
    </div>
  )
}
