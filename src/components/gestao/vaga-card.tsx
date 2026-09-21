import { Plus } from 'lucide-react'

export function VagaCard() {
  return (
    <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]">
      <div className="rounded-full bg-muted p-2">
        <Plus className="size-5 text-muted-foreground" />
      </div>
      <p className="text-xs font-medium text-muted-foreground text-center">
        Vaga disponível
      </p>
    </div>
  )
}
