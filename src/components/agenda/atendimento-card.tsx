import { useState } from 'react'
import { Link } from 'react-router'
import { Clock, User, Scissors, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { Atendimento, RespostaComparecimento } from '@/types'
import { api } from '@/services/api'
import {
  podeRegistrarComparecimento,
  tempoRestanteParaLiberaçao,
  registrarComparecimento,
  comparecimentoHabilitado,
  aplicarResultadoComparecimento,
} from '@/services/comparecimento'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface AtendimentoCardProps {
  atendimento: Atendimento
  onAtualizar?: (atendimento: Atendimento) => void
}

const situacaoConfig: Record<string, { label: string; className: string }> = {
  confirmado: {
    label: 'Confirmado',
    className: 'bg-primary-50 text-primary-700 border-primary-200',
  },
  atendimento_concluido: {
    label: 'Atendimento concluído',
    className: 'bg-success-50 text-success-600 border-success-500/20',
  },
  cliente_faltou: {
    label: 'Cliente faltou',
    className: 'bg-danger-50 text-danger-600 border-danger-500/20',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-muted text-muted-foreground border-border',
  },
  resultado_pendente: {
    label: 'Pendente',
    className: 'bg-warning-50 text-warning-600 border-warning-500/20',
  },
}

export function AtendimentoCard({ atendimento, onAtualizar }: AtendimentoCardProps) {
  const { usuario, isAdmin } = useAuth()
  const [confirmando, setConfirmando] = useState<RespostaComparecimento | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')

  const cliente = atendimento.clienteNome
  const servico = {
    nome: atendimento.servicoNome,
    duracaoMinutos: atendimento.duracaoMinutos,
    preco: atendimento.preco,
  }
  const profissional = atendimento.profissionalNome
  const situacao = situacaoConfig[atendimento.situacao] ?? situacaoConfig.confirmado

  const podeAgir = (() => {
    if (atendimento.situacao !== 'confirmado') return false
    if (!usuario) return false
    if (isAdmin) return true
    return usuario.profissionalId === atendimento.profissionalId
  })()

  const liberado = podeRegistrarComparecimento(atendimento.dataHora)
  const tempoRestante = tempoRestanteParaLiberaçao(atendimento.dataHora)
  const integracaoHabilitada = comparecimentoHabilitado()

  const formatarTempoRestante = (ms: number) => {
    const minutos = Math.floor(ms / 60000)
    const horas = Math.floor(minutos / 60)
    if (horas > 0) return `${horas}h ${minutos % 60}min`
    return `${minutos}min`
  }

  const handleResposta = async (resposta: RespostaComparecimento) => {
    if (processando || !integracaoHabilitada || !liberado || !podeAgir) return
    setProcessando(true)
    setErro('')

    try {
      const result = await registrarComparecimento(atendimento.id, resposta)
      if (result.sucesso) {
          onAtualizar?.(aplicarResultadoComparecimento(atendimento, result))
        setConfirmando(null)
      } else {
          setErro(result.mensagem)
      }
    } catch {
      setErro('Erro ao registrar. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const mostrarBotoes = podeAgir && liberado
  const mostrarBloqueio = podeAgir && !liberado

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <Link
        to={`/agenda/${atendimento.id}`}
        className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-t-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col items-center justify-center rounded-lg bg-primary-50 px-2.5 py-1.5 min-w-[52px]">
              <span className="text-lg font-bold text-primary-700 leading-none">
                {format(new Date(atendimento.dataHora), 'HH')}
              </span>
              <span className="text-xs text-primary-500 leading-none mt-0.5">
                {format(new Date(atendimento.dataHora), 'mm')}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{cliente}</p>
              {servico && (
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <Scissors className="size-3 shrink-0" />
                  {servico.nome}
                </p>
              )}
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium',
              situacao.className
            )}
          >
            {situacao.label}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="size-3" />
            {profissional}
          </span>
          {servico && (
            <>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {servico.duracaoMinutos} min
              </span>
              <span className="font-medium text-foreground">
                R$ {servico.preco.toFixed(2)}
              </span>
            </>
          )}
          <span className="ml-auto text-xs">
            {api.formatarOrigem(atendimento.origem)}
          </span>
        </div>
      </Link>

      {/* Área de registro de comparecimento */}
      {mostrarBotoes && (
        <div className="border-t px-4 py-3 space-y-2">
          {!integracaoHabilitada && <p className="text-sm text-muted-foreground" role="status">Registro de comparecimento temporariamente indisponível.</p>}
          {confirmando === null && (
            <>
              <p className="text-sm font-medium text-foreground">
                O cliente compareceu?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-success-600 hover:bg-success-600/90 text-white"
                  onClick={() => setConfirmando('sim')}
                  disabled={processando || !integracaoHabilitada}
                >
                  {processando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Sim
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-danger-500/30 text-danger-600 hover:bg-danger-50"
                  onClick={() => setConfirmando('nao')}
                  disabled={processando || !integracaoHabilitada}
                >
                  {processando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  Não
                </Button>
              </div>
            </>
          )}

          {confirmando === 'sim' && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <p className="text-sm text-foreground">
                Confirmar atendimento de <strong>{cliente}</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                {profissional} · {servico?.nome} · {format(new Date(atendimento.dataHora), 'HH:mm')}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-success-600 hover:bg-success-600/90 text-white"
                  onClick={() => handleResposta('sim')}
                  disabled={processando || !integracaoHabilitada}
                >
                  {processando ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  Sim, confirmar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmando(null)}
                  disabled={processando || !integracaoHabilitada}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {confirmando === 'nao' && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <p className="text-sm text-foreground">
                Registrar que <strong>{cliente}</strong> não compareceu?
              </p>
              <p className="text-xs text-muted-foreground">
                {profissional} · {servico?.nome} · {format(new Date(atendimento.dataHora), 'HH:mm')}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleResposta('nao')}
                  disabled={processando || !integracaoHabilitada}
                >
                  {processando ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  Sim, registrar falta
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmando(null)}
                  disabled={processando || !integracaoHabilitada}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {erro && (
            <p className="text-xs text-danger-600">{erro}</p>
          )}
        </div>
      )}

      {mostrarBloqueio && (
        <div className="border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Registro disponível a partir do início do atendimento, em {formatarTempoRestante(tempoRestante)}.
          </p>
        </div>
      )}
    </div>
  )
}
