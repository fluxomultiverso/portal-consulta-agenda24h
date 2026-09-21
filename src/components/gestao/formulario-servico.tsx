import { useId, useState } from 'react'
import type { OperacaoServico } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface FormularioServicoProps {
  onSalvar: (op: OperacaoServico) => void
  onCancelar: () => void
}

export function FormularioServico({ onSalvar, onCancelar }: FormularioServicoProps) {
  const idFormulario = useId()
  const [chave, setChave] = useState(`srv-${idFormulario.replace(/[^a-z0-9]/gi, '').toLowerCase()}`)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [duracaoMin, setDuracaoMin] = useState('')
  const [preco, setPreco] = useState('')
  const [prazoReativacaoDias, setPrazoReativacaoDias] = useState('30')
  const [requerAvaliacao, setRequerAvaliacao] = useState(false)
  const [ordemExibicao, setOrdemExibicao] = useState('1')

  const handleSalvar = () => {
    if (!nome.trim() || !chave.trim() || !duracaoMin || !preco) return

    onSalvar({
      tipo: 'adicao',
      chave: chave.trim(),
      dadosNovos: {
        chave: chave.trim(),
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        duracaoMin: parseInt(duracaoMin, 10),
        preco: parseFloat(preco),
        prazoReativacaoDias: parseInt(prazoReativacaoDias, 10) || 30,
        requerAvaliacao,
        ativo: true,
        ordemExibicao: parseInt(ordemExibicao, 10) || 1,
      },
    })
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Adicionar serviço</h3>
        <Button variant="ghost" size="icon-xs" onClick={onCancelar}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Chave *</label>
          <input
            type="text"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Identificador único"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nome *</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Ex: Corte Masculino"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Descrição do serviço"
            rows={2}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Duração (min) *</label>
          <input
            type="number"
            value={duracaoMin}
            onChange={(e) => setDuracaoMin(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="60"
            min="1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Preço (R$) *</label>
          <input
            type="number"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="50.00"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Prazo reativação (dias)</label>
          <input
            type="number"
            value={prazoReativacaoDias}
            onChange={(e) => setPrazoReativacaoDias(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            min="0"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Ordem de exibição</label>
          <input
            type="number"
            value={ordemExibicao}
            onChange={(e) => setOrdemExibicao(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            min="1"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requerAvaliacao}
              onChange={(e) => setRequerAvaliacao(e.target.checked)}
              className="rounded border"
            />
            <span className="text-xs font-medium text-muted-foreground">Requer avaliação</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSalvar} disabled={!nome.trim() || !chave.trim() || !duracaoMin || !preco}>
          Adicionar ao rascunho
        </Button>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
