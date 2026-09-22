import { useId, useState } from 'react'
import type { OperacaoServico, ServicoGestao } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Props { servico?: ServicoGestao; onSalvar: (op: OperacaoServico) => void; onCancelar: () => void }
const slug = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function FormularioServico({ servico, onSalvar, onCancelar }: Props) {
  const id = useId().replace(/[^a-z0-9]/gi, '').toLowerCase()
  const [nome, setNome] = useState(servico?.nome ?? '')
  const [descricao, setDescricao] = useState(servico?.descricao ?? '')
  const [duracao, setDuracao] = useState(String(servico?.duracaoMinutos ?? 60))
  const [preco, setPreco] = useState(String(servico?.preco ?? ''))
  const [prazo, setPrazo] = useState(String(servico?.prazoReativacaoDias ?? 30))
  const [avaliacao, setAvaliacao] = useState(servico?.requerAvaliacao ?? false)

  const salvar = () => {
    if (!nome.trim() || !duracao || preco === '') return
    const chave = servico ? `srv-${servico.id.slice(0, 8)}` : `srv-${slug(nome) || id}`
    const dados = { chave, nome: nome.trim(), descricao: descricao.trim() || undefined, duracaoMin: Number(duracao), preco: Number(preco), prazoReativacaoDias: Number(prazo) || 30, requerAvaliacao: avaliacao, ativo: true, ordemExibicao: servico?.ordemExibicao ?? 1 }
    onSalvar(servico ? { tipo: 'edicao', servicoExistenteId: servico.id, dadosAtualizados: dados } : { tipo: 'adicao', chave, dadosNovos: dados })
  }

  return <div className="rounded-xl border bg-white p-4 space-y-4">
    <div className="flex items-center justify-between"><h3 className="font-semibold">{servico ? 'Editar serviço' : 'Adicionar serviço'}</h3><Button variant="ghost" size="icon-xs" onClick={onCancelar} aria-label="Fechar"><X className="size-4" /></Button></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-medium">Nome *<input autoFocus value={nome} onChange={e=>setNome(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
      <label className="text-xs font-medium">Valor (R$) *<input type="number" min="0" step="0.01" value={preco} onChange={e=>setPreco(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
      <label className="text-xs font-medium sm:col-span-2">Descrição<textarea value={descricao} onChange={e=>setDescricao(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
      <label className="text-xs font-medium">Duração (minutos) *<input type="number" min="5" step="5" value={duracao} onChange={e=>setDuracao(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
      <label className="text-xs font-medium">Reativar após (dias)<input type="number" min="1" value={prazo} onChange={e=>setPrazo(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={avaliacao} onChange={e=>setAvaliacao(e.target.checked)} /> Requer avaliação antes do atendimento</label>
    <div className="flex gap-2"><Button onClick={salvar} disabled={!nome.trim() || !duracao || preco === ''}>{servico ? 'Salvar alteração' : 'Adicionar serviço'}</Button><Button variant="ghost" onClick={onCancelar}>Cancelar</Button></div>
  </div>
}
