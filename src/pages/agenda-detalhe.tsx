import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Scissors,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingState, ErrorState } from '@/components/ui/state'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import {
  podeRegistrarComparecimento,
  tempoRestanteParaLiberaçao,
  registrarComparecimento,
  comparecimentoHabilitado,
  aplicarResultadoComparecimento,
} from '@/services/comparecimento'
import type { Atendimento, RespostaComparecimento } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function AgendaDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario, isAdmin } = useAuth()
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [confirmando, setConfirmando] = useState<RespostaComparecimento | null>(null)
  const [processando, setProcessando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso')

  useEffect(() => {
    const carregar = async () => {
      if (!id) return
      setLoading(true)
      try {
        const att = await api.getAtendimentoById(id)
        if (att) {
          setAtendimento(att)
        } else {
          setErro(true)
        }
      } catch {
        setErro(true)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [id])

  const podeExecutarAcao = () => {
    if (!atendimento || !usuario) return false
    if (atendimento.situacao !== 'confirmado') return false
    if (isAdmin) return true
    return usuario.profissionalId === atendimento.profissionalId
  }

  const liberado = atendimento ? podeRegistrarComparecimento(atendimento.dataHora) : false
  const tempoRestante = atendimento ? tempoRestanteParaLiberaçao(atendimento.dataHora) : 0
  const integracaoHabilitada = comparecimentoHabilitado()

  const formatarTempoRestante = (ms: number) => {
    const minutos = Math.floor(ms / 60000)
    const horas = Math.floor(minutos / 60)
    if (horas > 0) return `${horas}h ${minutos % 60}min`
    return `${minutos}min`
  }

  const handleResposta = async (resposta: RespostaComparecimento) => {
    if (!atendimento || processando || !integracaoHabilitada || !liberado || !podeExecutarAcao()) return
    setProcessando(true)
    setMensagem('')

    try {
      const result = await registrarComparecimento(atendimento.id, resposta)
      if (result.sucesso) {
          setAtendimento(aplicarResultadoComparecimento(atendimento, result))
          setTipoMensagem('sucesso')
          setMensagem(result.mensagem)
        setConfirmando(null)
      } else {
          setTipoMensagem('erro')
          setMensagem(result.mensagem)
      }
    } catch {
      setTipoMensagem('erro')
      setMensagem('Erro ao registrar. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  if (loading) return <LoadingState message="Carregando atendimento..." />
  if (erro || !atendimento) {
    return (
      <ErrorState
        title="Atendimento não encontrado"
        description="O atendimento solicitado não existe ou foi removido."
        action={{ label: 'Voltar para agenda', onClick: () => navigate('/agenda') }}
      />
    )
  }

  const cliente = atendimento.clienteNome
  const servico = {
    nome: atendimento.servicoNome,
    duracaoMinutos: atendimento.duracaoMinutos,
    preco: atendimento.preco,
  }
  const profissional = atendimento.profissionalNome
  const podeAgir = podeExecutarAcao()

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/agenda')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Voltar para agenda
      </button>

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{cliente}</h2>
            {servico && (
              <p className="text-sm text-muted-foreground">{servico.nome}</p>
            )}
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              atendimento.situacao === 'atendimento_concluido'
                ? 'bg-success-50 text-success-600 border-success-500/20'
                : atendimento.situacao === 'cliente_faltou'
                  ? 'bg-danger-50 text-danger-600 border-danger-500/20'
                  : atendimento.situacao === 'cancelado'
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-primary-50 text-primary-700 border-primary-200'
            }`}
          >
            {api.formatarSituacao(atendimento.situacao)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            <span>
              {format(new Date(atendimento.dataHora), "d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" />
            <span>{format(new Date(atendimento.dataHora), 'HH:mm')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="size-4" />
            <span>{profissional}</span>
          </div>
          {servico && (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4" />
                <span>{servico.duracaoMinutos} min</span>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                <Scissors className="size-4" />
                <span>R$ {servico.preco.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4" />
            <span>Origem: {api.formatarOrigem(atendimento.origem)}</span>
          </div>
        </div>

        {mensagem && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              tipoMensagem === 'sucesso'
                ? 'bg-success-50 border-success-500/20 text-success-600'
                : 'bg-danger-50 border-danger-500/20 text-danger-600'
            }`}
          >
            {mensagem}
          </div>
        )}

        {/* Registro de comparecimento */}
        {podeAgir && (
          <div className="pt-2 border-t space-y-3">
            {!integracaoHabilitada && <p className="text-sm text-muted-foreground" role="status">Registro de comparecimento temporariamente indisponível.</p>}
            {!liberado ? (
              <p className="text-xs text-muted-foreground">
                Registro disponível a partir do início do atendimento, em{' '}
                {formatarTempoRestante(tempoRestante)}.
              </p>
            ) : confirmando === null ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  O cliente compareceu?
                </p>
                <div className="flex gap-2">
                  <Button
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
            ) : confirmando === 'sim' ? (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <p className="text-sm text-foreground">
                  Confirmar que o atendimento de <strong>{cliente}</strong> foi realizado?
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
            ) : (
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
          </div>
        )}

        {!podeAgir && atendimento.situacao === 'confirmado' && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Você não tem permissão para registrar comparecimento deste atendimento.
          </p>
        )}
      </div>
    </div>
  )
}
