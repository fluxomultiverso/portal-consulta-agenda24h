import { useId, useState } from 'react'
import type { EmpresaGestao, OperacaoProfissional, RascunhoGestao, HorarioTrabalho } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle, Plus, Trash2 } from 'lucide-react'

interface FormularioProfissionalProps {
  empresa: EmpresaGestao
  rascunho: RascunhoGestao | null
  onSalvar: (op: OperacaoProfissional) => void
  onCancelar: () => void
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function FormularioProfissional({
  empresa,
  rascunho,
  onSalvar,
  onCancelar,
}: FormularioProfissionalProps) {
  const idFormulario = useId()
  const [chave, setChave] = useState(`prof-${idFormulario.replace(/[^a-z0-9]/gi, '').toLowerCase()}`)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [acessoPortal, setAcessoPortal] = useState(false)
  const [corAgenda, setCorAgenda] = useState('#3B82F6')
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([])
  const [horarios, setHorarios] = useState<HorarioTrabalho[]>([])

  const servicosAtivos = empresa.servicos.filter((s) => s.ativo)

  const servicosMarcadosRemocao = new Set(
    rascunho?.operacoesServicos
      .filter((op) => op.tipo === 'remocao')
      .map((op) => op.servicoExistenteId) ?? []
  )

  const toggleServico = (id: string) => {
    if (servicosMarcadosRemocao.has(id)) return
    setServicosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const adicionarHorario = () => {
    setHorarios([
      ...horarios,
      { diaSemana: 1, horaInicio: '09:00', horaFim: '18:00', ativo: true },
    ])
  }

  const removerHorario = (index: number) => {
    setHorarios(horarios.filter((_, i) => i !== index))
  }

  const atualizarHorario = (index: number, campo: keyof HorarioTrabalho, valor: string | number | boolean) => {
    setHorarios(
      horarios.map((h, i) => (i === index ? { ...h, [campo]: valor } : h))
    )
  }

  const handleSalvar = () => {
    if (!nome.trim() || !chave.trim()) return
    if (acessoPortal && !email.trim()) return

    onSalvar({
      tipo: 'inclusao',
      chave: chave.trim(),
      dadosNovos: {
        chave: chave.trim(),
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        acessoPortal,
        corAgenda,
        servicoIds: servicosSelecionados,
        horarios,
        ativo: true,
      },
    })
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Adicionar profissional</h3>
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
            placeholder="Nome completo"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Email {acessoPortal && '*'}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="email@exemplo.com"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Telefone</label>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="+5511999999999"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cor da agenda</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={corAgenda}
              onChange={(e) => setCorAgenda(e.target.value)}
              className="size-9 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={corAgenda}
              onChange={(e) => setCorAgenda(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={acessoPortal}
              onChange={(e) => setAcessoPortal(e.target.checked)}
              className="rounded border"
            />
            <span className="text-xs font-medium text-muted-foreground">Acesso ao portal</span>
          </label>
        </div>
      </div>

      {acessoPortal && !email.trim() && (
        <div className="flex items-start gap-1 text-[10px] text-warning-600">
          <AlertTriangle className="size-3 shrink-0 mt-0.5" />
          <span>Email é obrigatório quando o acesso ao portal está ativo.</span>
        </div>
      )}

      {/* Serviços */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">
          Serviços realizados
        </label>
        <div className="flex flex-wrap gap-2">
          {servicosAtivos.map((s) => {
            const marcadoRemocao = servicosMarcadosRemocao.has(s.id)
            const selecionado = servicosSelecionados.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleServico(s.id)}
                disabled={marcadoRemocao}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  marcadoRemocao
                    ? 'bg-muted text-muted-foreground/50 border-border cursor-not-allowed line-through'
                    : selecionado
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-foreground border-border hover:bg-muted'
                }`}
              >
                {s.nome}
              </button>
            )
          })}
        </div>
      </div>

      {/* Horários */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Horários de trabalho</label>
          <Button variant="ghost" size="xs" onClick={adicionarHorario}>
            <Plus className="size-3" />
            Adicionar
          </Button>
        </div>
        {horarios.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={h.diaSemana}
              onChange={(e) => atualizarHorario(i, 'diaSemana', parseInt(e.target.value))}
              className="rounded border px-2 py-1 text-xs"
            >
              {DIAS_SEMANA.map((d, idx) => (
                <option key={idx} value={idx}>{d}</option>
              ))}
            </select>
            <input
              type="time"
              value={h.horaInicio}
              onChange={(e) => atualizarHorario(i, 'horaInicio', e.target.value)}
              className="rounded border px-2 py-1 text-xs"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <input
              type="time"
              value={h.horaFim}
              onChange={(e) => atualizarHorario(i, 'horaFim', e.target.value)}
              className="rounded border px-2 py-1 text-xs"
            />
            <Button variant="ghost" size="icon-xs" onClick={() => removerHorario(i)}>
              <Trash2 className="size-3 text-danger-600" />
            </Button>
          </div>
        ))}
        {horarios.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic">Nenhum horário definido.</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSalvar} disabled={!nome.trim() || !chave.trim() || (acessoPortal && !email.trim())}>
          Adicionar ao rascunho
        </Button>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
