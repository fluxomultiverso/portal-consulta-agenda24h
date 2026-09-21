import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { consultarEmpresaGestao } from '@/services/gestao'
import {
  calcularOcupacao,
  validarRascunho,
  gerarJsonSolicitacao,
} from '@/services/solicitacao-gestao'
import { enviarSolicitacaoGestao } from '@/services/gestao-webhook'
import type {
  EmpresaGestao,
  RascunhoGestao,
  OperacaoProfissional,
  OperacaoServico,
} from '@/types/gestao'
import { LoadingState, ErrorState, UnauthorizedState } from '@/components/ui/state'
import { Button } from '@/components/ui/button'
import {
  Users,
  Plus,
  Send,
  Undo2,
  X,
  AlertTriangle,
  CheckCircle2,
  Scissors,
} from 'lucide-react'
import { ProfissionalCard } from '@/components/gestao/profissional-card'
import { VagaCard } from '@/components/gestao/vaga-card'
import { ServicoCard } from '@/components/gestao/servico-card'
import { FormularioProfissional } from '@/components/gestao/formulario-profissional'
import { FormularioServico } from '@/components/gestao/formulario-servico'
import { ResumoSolicitacao } from '@/components/gestao/resumo-solicitacao'

export function GestaoPage() {
  const { usuario, isAdmin, empresa } = useAuth()
  const [empresaGestao, setEmpresaGestao] = useState<EmpresaGestao | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [modoRascunho, setModoRascunho] = useState(false)
  const [rascunho, setRascunho] = useState<RascunhoGestao | null>(null)
  const [mostrarFormProfissional, setMostrarFormProfissional] = useState(false)
  const [mostrarFormServico, setMostrarFormServico] = useState(false)
  const [mostrarResumo, setMostrarResumo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    const carregar = async () => {
      if (!usuario?.empresaId) return
      setLoading(true)
      const result = await consultarEmpresaGestao(usuario.empresaId)
      if (result.sucesso && result.dados) {
        setEmpresaGestao(result.dados)
      } else {
        setErro(result.erro ?? 'Erro ao carregar dados.')
      }
      setLoading(false)
    }
    carregar()
  }, [usuario?.empresaId])

  if (!isAdmin) return <UnauthorizedState />
  if (loading) return <LoadingState message="Carregando gestão..." />
  if (erro) return <ErrorState title="Erro ao carregar" description={erro} />
  if (!empresaGestao) return <ErrorState title="Empresa não encontrada" />

  const ocupacao = calcularOcupacao(empresaGestao, rascunho)
  const profissionaisAtivos = empresaGestao.profissionais.filter((p) => p.ativo)
  const servicosAtivos = empresaGestao.servicos.filter((s) => s.ativo)

  const iniciarRascunho = () => {
    setRascunho({
      operacoesProfissionais: [],
      operacoesServicos: [],
      criadoEm: new Date().toISOString(),
    })
    setModoRascunho(true)
  }

  const descartarRascunho = () => {
    setRascunho(null)
    setModoRascunho(false)
    setMostrarFormProfissional(false)
    setMostrarFormServico(false)
    setMostrarResumo(false)
    setMensagem(null)
  }

  const adicionarOperacaoProfissional = (op: OperacaoProfissional) => {
    if (!rascunho) return
    setRascunho({
      ...rascunho,
      operacoesProfissionais: [...rascunho.operacoesProfissionais, op],
    })
    setMostrarFormProfissional(false)
  }

  const adicionarOperacaoServico = (op: OperacaoServico) => {
    if (!rascunho) return
    setRascunho({
      ...rascunho,
      operacoesServicos: [...rascunho.operacoesServicos, op],
    })
    setMostrarFormServico(false)
  }

  const desfazerOperacao = (index: number, tipo: 'profissional' | 'servico') => {
    if (!rascunho) return
    if (tipo === 'profissional') {
      setRascunho({
        ...rascunho,
        operacoesProfissionais: rascunho.operacoesProfissionais.filter((_, i) => i !== index),
      })
    } else {
      setRascunho({
        ...rascunho,
        operacoesServicos: rascunho.operacoesServicos.filter((_, i) => i !== index),
      })
    }
  }

  const handleEnviar = async () => {
    if (!rascunho || !usuario || !empresaGestao) return

    const validacao = validarRascunho(empresaGestao, rascunho)
    if (!validacao.valido) {
      setMensagem({ tipo: 'erro', texto: validacao.erros.join(' ') })
      return
    }

    setEnviando(true)
    setMensagem(null)

    try {
      const json = gerarJsonSolicitacao(
        empresaGestao,
        rascunho,
        rascunho.solicitacaoId
      )

      // Atualizar o ID no rascunho se for a primeira geração
      if (!rascunho.solicitacaoId) {
        setRascunho({ ...rascunho, solicitacaoId: json.solicitacao_id })
      }

      const result = await enviarSolicitacaoGestao({
        jsonSolicitacao: JSON.stringify(json, null, 2),
        nomeSolicitante: usuario.nome,
        nomeEmpresa: empresaGestao.nomeFantasia,
      })

      if (result.sucesso) {
        setMensagem({
          tipo: 'sucesso',
          texto: 'Solicitação enviada. As alterações serão realizadas em até 24 horas.',
        })
        setRascunho(null)
        setModoRascunho(false)
        setMostrarResumo(false)
      } else {
        setMensagem({ tipo: 'erro', texto: result.mensagem })
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar solicitação. Tente novamente.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gestão de profissionais e serviços</h2>
          <p className="text-sm text-muted-foreground">{empresaGestao?.nomeFantasia ?? empresa?.nome}</p>
        </div>
        {!modoRascunho && (
          <Button onClick={iniciarRascunho}>
            <Plus className="size-4" />
            Solicitar alterações
          </Button>
        )}
      </div>

      {/* Plano e ocupação */}
      <div className="rounded-xl border bg-white p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Plano: {empresaGestao.plano.nome}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Ocupação: <strong className="text-foreground">{ocupacao.atual}</strong> / {ocupacao.capacidade}
          </span>
          {modoRascunho && rascunho && (
            <span className="text-muted-foreground">
              Proposta: <strong className="text-primary-600">{ocupacao.proposta}</strong>
            </span>
          )}
          <span className="text-muted-foreground">
            Vagas: <strong className={ocupacao.vagasDisponiveis === 0 ? 'text-danger-600' : 'text-success-600'}>{ocupacao.vagasDisponiveis}</strong>
          </span>
        </div>
        {ocupacao.acimaDoLimite && (
          <div className="flex items-center gap-2 rounded-lg bg-warning-50 border border-warning-500/20 p-2 text-xs text-warning-600">
            <AlertTriangle className="size-4" />
            Ocupação acima do limite contratual.
          </div>
        )}
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div
          className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
            mensagem.tipo === 'sucesso'
              ? 'bg-success-50 border-success-500/20 text-success-600'
              : 'bg-danger-50 border-danger-500/20 text-danger-600'
          }`}
        >
          {mensagem.tipo === 'sucesso' ? (
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          )}
          {mensagem.texto}
        </div>
      )}

      {/* Modo rascunho */}
      {modoRascunho && (
        <div className="rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-700">Modo de rascunho ativo</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={descartarRascunho}>
                <X className="size-4" />
                Descartar
              </Button>
              {rascunho && (rascunho.operacoesProfissionais.length > 0 || rascunho.operacoesServicos.length > 0) && (
                <Button size="sm" onClick={() => setMostrarResumo(true)}>
                  <Send className="size-4" />
                  Revisar e enviar
                </Button>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            {ocupacao.vagasDisponiveis > 0 && (
              <Button variant="outline" size="sm" onClick={() => setMostrarFormProfissional(true)}>
                <Plus className="size-4" />
                Adicionar profissional
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setMostrarFormServico(true)}>
              <Plus className="size-4" />
              Adicionar serviço
            </Button>
          </div>
        </div>
      )}

      {/* Formulário de profissional */}
      {mostrarFormProfissional && modoRascunho && (
        <FormularioProfissional
          empresa={empresaGestao}
          rascunho={rascunho}
          onSalvar={adicionarOperacaoProfissional}
          onCancelar={() => setMostrarFormProfissional(false)}
        />
      )}

      {/* Formulário de serviço */}
      {mostrarFormServico && modoRascunho && (
        <FormularioServico
          onSalvar={adicionarOperacaoServico}
          onCancelar={() => setMostrarFormServico(false)}
        />
      )}

      {/* Resumo antes do envio */}
      {mostrarResumo && rascunho && (
        <ResumoSolicitacao
          empresa={empresaGestao}
          rascunho={rascunho}
          ocupacao={ocupacao}
          onEnviar={handleEnviar}
          onVoltar={() => setMostrarResumo(false)}
          enviando={enviando}
        />
      )}

      {/* Seção Profissionais */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="size-4" />
          Profissionais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profissionaisAtivos.map((prof) => (
            <ProfissionalCard
              key={prof.id}
              profissional={prof}
              servicos={empresaGestao.servicos}
              modoRascunho={modoRascunho}
              rascunho={rascunho}
              onRemover={(id) =>
                adicionarOperacaoProfissional({
                  tipo: 'remocao',
                  profissionalExistenteId: id,
                })
              }
              onDesfazerRemocao={(index) => desfazerOperacao(index, 'profissional')}
            />
          ))}
          {Array.from({ length: ocupacao.vagasDisponiveis }).map((_, i) => (
            <VagaCard key={`vaga-${i}`} />
          ))}
        </div>
      </div>

      {/* Seção Serviços */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Scissors className="size-4" />
          Serviços
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {servicosAtivos.map((serv) => (
            <ServicoCard
              key={serv.id}
              servico={serv}
              profissionais={empresaGestao.profissionais}
              modoRascunho={modoRascunho}
              rascunho={rascunho}
              onRemover={(id) =>
                adicionarOperacaoServico({
                  tipo: 'remocao',
                  servicoExistenteId: id,
                })
              }
              onDesvincular={(servicoId, profissionalIds) =>
                adicionarOperacaoServico({
                  tipo: 'desvincular',
                  servicoExistenteId: servicoId,
                  profissionalIdsAfetados: profissionalIds,
                })
              }
              onDesfazer={(index) => desfazerOperacao(index, 'servico')}
            />
          ))}
        </div>
      </div>

      {/* Operações pendentes */}
      {rascunho && (rascunho.operacoesProfissionais.length > 0 || rascunho.operacoesServicos.length > 0) && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Operações pendentes</h3>
          
          {/* Operações de profissionais */}
          {rascunho.operacoesProfissionais.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Profissionais</p>
              {rascunho.operacoesProfissionais.map((op, i) => (
                <div key={`prof-${i}`} className="flex items-center justify-between rounded-lg bg-muted p-2 text-xs">
                  <span>
                    {op.tipo === 'inclusao' && `+ Adicionar: ${op.dadosNovos?.nome ?? 'Novo profissional'}`}
                    {op.tipo === 'remocao' && `- Remover: ${empresaGestao.profissionais.find((p) => p.id === op.profissionalExistenteId)?.nome ?? 'Profissional'}`}
                    {op.tipo === 'substituicao' && `↔ Substituir: ${empresaGestao.profissionais.find((p) => p.id === op.profissionalExistenteId)?.nome ?? 'Profissional'} → ${op.dadosSubstituto?.nome ?? 'Novo'}`}
                  </span>
                  <Button variant="ghost" size="icon-xs" onClick={() => desfazerOperacao(i, 'profissional')}>
                    <Undo2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Operações de serviços */}
          {rascunho.operacoesServicos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Serviços</p>
              {rascunho.operacoesServicos.map((op, i) => (
                <div key={`srv-${i}`} className="flex items-center justify-between rounded-lg bg-muted p-2 text-xs">
                  <span>
                    {op.tipo === 'adicao' && `+ Adicionar: ${op.dadosNovos?.nome ?? 'Novo serviço'}`}
                    {op.tipo === 'remocao' && `- Remover: ${empresaGestao.servicos.find((s) => s.id === op.servicoExistenteId)?.nome ?? 'Serviço'}`}
                    {op.tipo === 'desvincular' && `↩ Desvincular: ${empresaGestao.servicos.find((s) => s.id === op.servicoExistenteId)?.nome ?? 'Serviço'} de ${op.profissionalIdsAfetados?.length ?? 0} profissional(is)`}
                  </span>
                  <Button variant="ghost" size="icon-xs" onClick={() => desfazerOperacao(i, 'servico')}>
                    <Undo2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
