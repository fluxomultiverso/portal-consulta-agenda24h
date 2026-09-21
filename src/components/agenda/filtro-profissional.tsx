import { useAuth } from '@/hooks/use-auth'
import type { Profissional } from '@/types'
import { cn } from '@/lib/utils'

interface FiltroProfissionalProps {
  profissionais: Profissional[]
  selecionado: string | null
  onChange: (id: string | null) => void
}

export function FiltroProfissional({
  profissionais,
  selecionado,
  onChange,
}: FiltroProfissionalProps) {
  const { isAdmin } = useAuth()

  if (!isAdmin) return null

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Profissional
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            selecionado === null
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-foreground border-border hover:bg-muted'
          )}
        >
          Todos
        </button>
        {profissionais.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              selecionado === p.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-foreground border-border hover:bg-muted'
            )}
          >
            {p.nome.split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  )
}
