import type { RecepcionistaGestao, RascunhoGestao } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
export function RecepcionistaCard({recepcionista,rascunho,editando,onEditar,onRemover,onDesfazer}:{recepcionista:RecepcionistaGestao;rascunho:RascunhoGestao|null;editando:boolean;onEditar:()=>void;onRemover:()=>void;onDesfazer:(i:number)=>void}){
 const idx=rascunho?.operacoesRecepcionistas.findIndex(o=>o.recepcionistaExistenteId===recepcionista.id)??-1; const op=idx>=0?rascunho?.operacoesRecepcionistas[idx]:undefined; const removido=op?.tipo==='remocao'
 return <div className={cn('rounded-xl border bg-white p-4',removido&&'border-danger-500/30 bg-danger-50/30 opacity-70')}><div className="flex justify-between gap-2"><div><p className="font-semibold">{recepcionista.nome}</p><p className="text-xs text-muted-foreground">{recepcionista.email}</p>{op?.tipo==='edicao'&&<p className="mt-1 text-xs text-primary-600">Alteração pendente</p>}{removido&&<p className="mt-1 text-xs text-danger-600">Exclusão pendente</p>}</div>{editando&&(removido?<Button variant="ghost" size="icon-xs" onClick={()=>onDesfazer(idx)} aria-label="Desfazer"><Undo2 className="size-4"/></Button>:<div className="flex"><Button variant="ghost" size="icon-xs" onClick={onEditar} aria-label="Editar"><Pencil className="size-4"/></Button><Button variant="ghost" size="icon-xs" onClick={onRemover} aria-label="Excluir"><Trash2 className="size-4 text-danger-600"/></Button></div>)}</div></div>
}
