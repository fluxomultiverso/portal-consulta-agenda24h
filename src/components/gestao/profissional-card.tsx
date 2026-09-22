import type { ProfissionalGestao, ServicoGestao, RascunhoGestao } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfissionalCardProps {
  profissional: ProfissionalGestao
  servicos: ServicoGestao[]
  modoRascunho: boolean
  rascunho: RascunhoGestao | null
  onRemover: (id: string) => void
  onEditar: (profissional: ProfissionalGestao) => void
  onDesfazerRemocao: (index: number) => void
}

export function ProfissionalCard({
  profissional,
  servicos,
  modoRascunho,
  rascunho,
  onRemover,
  onEditar,
  onDesfazerRemocao,
}: ProfissionalCardProps) {
  const servicosVinculados = servicos.filter((s) =>
    profissional.servicoIds.includes(s.id)
  )

  const estaMarcadoRemocao = rascunho?.operacoesProfissionais.some(
    (op) => op.tipo === 'remocao' && op.profissionalExistenteId === profissional.id
  )

  const indexRemocao = rascunho?.operacoesProfissionais.findIndex(
    (op) => op.tipo === 'remocao' && op.profissionalExistenteId === profissional.id
  ) ?? -1
  const estaEditado = rascunho?.operacoesProfissionais.some((op) => op.tipo === 'edicao' && op.profissionalExistenteId === profissional.id)

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 space-y-3',
        estaMarcadoRemocao && 'border-danger-500/30 bg-danger-50/30 opacity-60'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{profissional.nome}</p>
          {profissional.acessoPortal && (
            <p className="text-xs text-primary-600">Acesso ao portal</p>
          )}
        </div>
        {modoRascunho && !estaMarcadoRemocao && (
          <div className="flex"><Button variant="ghost" size="icon-xs" onClick={() => onEditar(profissional)} aria-label="Editar profissional"><Pencil className="size-3.5" /></Button><Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemover(profissional.id)}
            className="text-danger-600 hover:bg-danger-50"
          >
            <Trash2 className="size-3.5" />
          </Button></div>
        )}
        {estaMarcadoRemocao && indexRemocao >= 0 && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDesfazerRemocao(indexRemocao)}
          >
            <Undo2 className="size-3.5" />
          </Button>
        )}
      </div>

      {estaMarcadoRemocao ? (
        <p className="text-xs text-danger-600 font-medium">Remoção solicitada</p>
      ) : (
        <>
          {servicosVinculados.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {servicosVinculados.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-primary-50 text-primary-700 px-2 py-0.5 text-[10px] font-medium"
                >
                  {s.nome}
                </span>
              ))}
            </div>
          )}
          {estaEditado && <p className="text-xs font-medium text-primary-600">Alteração pendente</p>}

          <p className="text-xs text-muted-foreground">
            {profissional.horarios.length} dia(s) de trabalho
          </p>
        </>
      )}
    </div>
  )
}
