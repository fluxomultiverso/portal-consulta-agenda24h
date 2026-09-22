import type { ServicoGestao, ProfissionalGestao, RascunhoGestao } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServicoCardProps {
  servico: ServicoGestao
  profissionais: ProfissionalGestao[]
  modoRascunho: boolean
  rascunho: RascunhoGestao | null
  onRemover: (id: string) => void
  onEditar: (servico: ServicoGestao) => void
  onDesfazer: (index: number) => void
}

export function ServicoCard({
  servico,
  profissionais,
  modoRascunho,
  rascunho,
  onRemover,
  onEditar,
  onDesfazer,
}: ServicoCardProps) {
  const profissionaisVinculados = profissionais.filter(
    (p) => p.ativo && p.servicoIds.includes(servico.id)
  )

  const estaMarcadoRemocao = rascunho?.operacoesServicos.some(
    (op) => op.tipo === 'remocao' && op.servicoExistenteId === servico.id
  )

  const indexRemocao = rascunho?.operacoesServicos.findIndex(
    (op) => op.tipo === 'remocao' && op.servicoExistenteId === servico.id
  ) ?? -1

  const estaEditado = rascunho?.operacoesServicos.some((op) => op.tipo === 'edicao' && op.servicoExistenteId === servico.id)

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 space-y-3',
        estaMarcadoRemocao && 'border-danger-500/30 bg-danger-50/30 opacity-60'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{servico.nome}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{servico.duracaoMinutos} min</span>
            <span className="font-medium text-foreground">
              R$ {servico.preco.toFixed(2)}
            </span>
          </div>
        </div>
        {modoRascunho && !estaMarcadoRemocao && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-xs" onClick={() => onEditar(servico)} title="Editar serviço"><Pencil className="size-3.5" /></Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemover(servico.id)}
              className="text-danger-600 hover:bg-danger-50"
              title="Remover do catálogo"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
        {estaMarcadoRemocao && indexRemocao >= 0 && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDesfazer(indexRemocao)}
          >
            <Undo2 className="size-3.5" />
          </Button>
        )}
      </div>

      {estaMarcadoRemocao ? (
        <div className="space-y-1">
          <p className="text-xs text-danger-600 font-medium">Remoção solicitada</p>
          {profissionaisVinculados.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Vinculado a: {profissionaisVinculados.map((p) => p.nome).join(', ')}
            </p>
          )}
        </div>
      ) : (
        <div>
          {estaEditado && <p className="mb-2 text-xs font-medium text-primary-600">Alteração pendente</p>}
          {profissionaisVinculados.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {profissionaisVinculados.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {p.nome.split(' ')[0]}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">
              Sem profissionais vinculados
            </p>
          )}
        </div>
      )}
    </div>
  )
}
