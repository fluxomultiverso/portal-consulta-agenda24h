import type { EmpresaGestao, RascunhoGestao, ResumoOcupacao } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react'

export function ResumoSolicitacao({empresa,rascunho,ocupacao,onEnviar,onVoltar,enviando}:{empresa:EmpresaGestao;rascunho:RascunhoGestao;ocupacao:ResumoOcupacao;onEnviar:()=>void;onVoltar:()=>void;enviando:boolean}){
 const grupos=[
  {titulo:'Profissionais',ops:rascunho.operacoesProfissionais,nome:(o:typeof rascunho.operacoesProfissionais[number])=>(o.dadosNovos??o.dadosAtualizados)?.nome??empresa.profissionais.find(x=>x.id===o.profissionalExistenteId)?.nome},
  {titulo:'Recepcionistas',ops:rascunho.operacoesRecepcionistas,nome:(o:typeof rascunho.operacoesRecepcionistas[number])=>(o.dadosNovos??o.dadosAtualizados)?.nome??empresa.recepcionistas.find(x=>x.id===o.recepcionistaExistenteId)?.nome},
  {titulo:'Serviços',ops:rascunho.operacoesServicos,nome:(o:typeof rascunho.operacoesServicos[number])=>(o.dadosNovos??o.dadosAtualizados)?.nome??empresa.servicos.find(x=>x.id===o.servicoExistenteId)?.nome},
 ]
 return <div className="space-y-4"><div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">Revise antes de enviar</h3><p className="mt-1 text-sm text-muted-foreground">{empresa.nomeFantasia} · {empresa.plano.nome}</p></div>
 {grupos.filter(g=>g.ops.length).map(g=><div key={g.titulo} className="rounded-xl border bg-white p-4"><h4 className="mb-3 text-sm font-semibold">{g.titulo}</h4><div className="space-y-2">{g.ops.map((o,i)=><div key={i} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"><CheckCircle2 className="size-4 text-primary-600"/><span className="capitalize">{o.tipo}</span><strong>{g.nome(o as never)}</strong></div>)}</div></div>)}
 <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border bg-white p-4"><p className="text-xs text-muted-foreground">Profissionais após o envio</p><p className="text-lg font-semibold">{ocupacao.proposta} de {ocupacao.capacidade}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-muted-foreground">Recepcionistas após o envio</p><p className="text-lg font-semibold">{ocupacao.recepcionistasPropostos} de {ocupacao.capacidadeRecepcionistas}</p></div></div>
 <p className="text-xs text-muted-foreground">Ao confirmar, o workflow validará sua identidade de administrador e aplicará todas as alterações em uma única operação.</p><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button variant="outline" onClick={onVoltar} disabled={enviando}><ArrowLeft className="size-4"/>Voltar</Button><Button onClick={onEnviar} disabled={enviando}>{enviando?'Aplicando alterações...':<><Send className="size-4"/>Confirmar e aplicar</>}</Button></div></div>
}
