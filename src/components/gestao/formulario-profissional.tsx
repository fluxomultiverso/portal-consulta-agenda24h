import { useId, useState } from 'react'
import type { EmpresaGestao, HorarioTrabalho, OperacaoProfissional, ProfissionalGestao, RascunhoGestao } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react'

interface Props { empresa: EmpresaGestao; rascunho: RascunhoGestao | null; profissional?: ProfissionalGestao; onSalvar: (op: OperacaoProfissional) => void; onCancelar: () => void }
const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const slug = (v:string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')

export function FormularioProfissional({ empresa, rascunho, profissional, onSalvar, onCancelar }: Props) {
  const id = useId().replace(/[^a-z0-9]/gi,'').toLowerCase()
  const [nome,setNome]=useState(profissional?.nome ?? '')
  const [email,setEmail]=useState(profissional?.email ?? '')
  const [telefone,setTelefone]=useState(profissional?.telefone ?? '')
  const [acesso,setAcesso]=useState(profissional?.acessoPortal ?? false)
  const [cor,setCor]=useState(profissional?.corAgenda ?? '#3B82F6')
  const [servicos,setServicos]=useState<string[]>(profissional?.servicoIds ?? [])
  const [horarios,setHorarios]=useState<HorarioTrabalho[]>(profissional?.horarios ?? [])
  const removidos=new Set(rascunho?.operacoesServicos.filter(o=>o.tipo==='remocao').map(o=>o.servicoExistenteId))
  const salvar=()=>{
    if(!nome.trim() || (acesso && !email.trim())) return
    const chave=profissional ? `prof-${profissional.id.slice(0,8)}` : `prof-${slug(nome)||id}`
    const dados={chave,usuarioId:profissional?.usuarioId,nome:nome.trim(),email:email.trim()||undefined,telefone:telefone.trim()||undefined,acessoPortal:acesso,corAgenda:cor,ativo:true,servicoIds:servicos,horarios}
    onSalvar(profissional?{tipo:'edicao',profissionalExistenteId:profissional.id,dadosAtualizados:dados}:{tipo:'inclusao',chave,dadosNovos:dados})
  }
  return <div className="rounded-xl border bg-white p-4 space-y-4">
    <div className="flex items-center justify-between"><h3 className="font-semibold">{profissional?'Editar profissional':'Adicionar profissional'}</h3><Button variant="ghost" size="icon-xs" onClick={onCancelar} aria-label="Fechar"><X className="size-4"/></Button></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-medium">Nome *<input autoFocus value={nome} onChange={e=>setNome(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label>
      <label className="text-xs font-medium">Telefone<input type="tel" value={telefone} onChange={e=>setTelefone(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label>
      <label className="text-xs font-medium">E-mail {acesso&&'*'}<input type="email" value={email} disabled={Boolean(profissional?.usuarioId)} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-muted"/></label>
      <label className="text-xs font-medium">Cor da agenda<input type="color" value={cor} onChange={e=>setCor(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border p-1"/></label>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={acesso} onChange={e=>setAcesso(e.target.checked)}/> Permitir acesso ao portal</label>
    {acesso&&!email.trim()&&<p className="flex gap-2 text-xs text-warning-600"><AlertTriangle className="size-4"/>Informe o e-mail usado no acesso.</p>}
    <div><p className="mb-2 text-xs font-medium">Serviços realizados</p><div className="flex flex-wrap gap-2">{empresa.servicos.filter(s=>s.ativo).map(s=><button key={s.id} type="button" disabled={removidos.has(s.id)} onClick={()=>setServicos(v=>v.includes(s.id)?v.filter(x=>x!==s.id):[...v,s.id])} className={`rounded-full border px-3 py-1.5 text-xs ${servicos.includes(s.id)?'bg-primary-600 text-white':'bg-white'} disabled:opacity-40`}>{s.nome}</button>)}</div></div>
    <div className="space-y-2"><div className="flex justify-between"><p className="text-xs font-medium">Horários de trabalho</p><Button variant="ghost" size="xs" onClick={()=>setHorarios(v=>[...v,{diaSemana:1,horaInicio:'09:00',horaFim:'18:00',ativo:true}])}><Plus className="size-3"/>Adicionar</Button></div>
      {horarios.map((h,i)=><div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2"><select value={h.diaSemana} onChange={e=>setHorarios(v=>v.map((x,j)=>j===i?{...x,diaSemana:Number(e.target.value)}:x))} className="rounded border p-2 text-xs">{DIAS.map((d,n)=><option value={n} key={d}>{d}</option>)}</select><input type="time" value={h.horaInicio} onChange={e=>setHorarios(v=>v.map((x,j)=>j===i?{...x,horaInicio:e.target.value}:x))} className="rounded border p-2 text-xs"/><input type="time" value={h.horaFim} onChange={e=>setHorarios(v=>v.map((x,j)=>j===i?{...x,horaFim:e.target.value}:x))} className="rounded border p-2 text-xs"/><Button variant="ghost" size="icon-xs" onClick={()=>setHorarios(v=>v.filter((_,j)=>j!==i))}><Trash2 className="size-4 text-danger-600"/></Button></div>)}
    </div>
    <div className="flex gap-2"><Button onClick={salvar} disabled={!nome.trim()||(acesso&&!email.trim())}>{profissional?'Salvar alteração':'Adicionar profissional'}</Button><Button variant="ghost" onClick={onCancelar}>Cancelar</Button></div>
  </div>
}
