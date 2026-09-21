import type { EmpresaGestao, RascunhoGestao, ResumoOcupacao } from '@/types/gestao'
import { Button } from '@/components/ui/button'
import { Send, ArrowLeft, AlertTriangle } from 'lucide-react'

interface ResumoSolicitacaoProps {
  empresa: EmpresaGestao
  rascunho: RascunhoGestao
  ocupacao: ResumoOcupacao
  onEnviar: () => void
  onVoltar: () => void
  enviando: boolean
}

export function ResumoSolicitacao({
  empresa,
  rascunho,
  ocupacao,
  onEnviar,
  onVoltar,
  enviando,
}: ResumoSolicitacaoProps) {
  const mantidos = empresa.profissionais.filter(
    (p) =>
      p.ativo &&
      !rascunho.operacoesProfissionais.some(
        (op) =>
          (op.tipo === 'remocao' || op.tipo === 'substituicao') &&
          op.profissionalExistenteId === p.id
      )
  )

  const inclusoes = rascunho.operacoesProfissionais.filter((op) => op.tipo === 'inclusao')
  const remocoes = rascunho.operacoesProfissionais.filter((op) => op.tipo === 'remocao')
  const substituicoes = rascunho.operacoesProfissionais.filter((op) => op.tipo === 'substituicao')

  const adicoesServicos = rascunho.operacoesServicos.filter((op) => op.tipo === 'adicao')
  const remocoesServicos = rascunho.operacoesServicos.filter((op) => op.tipo === 'remocao')
  const desvinculacoes = rascunho.operacoesServicos.filter((op) => op.tipo === 'desvincular')

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Resumo da solicitação</h3>

      {/* Empresa */}
      <div className="rounded-lg bg-muted p-3 space-y-1">
        <p className="text-xs font-medium text-foreground">{empresa.nomeFantasia}</p>
        <p className="text-[10px] text-muted-foreground">
          Plano: {empresa.plano.nome} · Código: {empresa.plano.codigo}
        </p>
      </div>

      {/* Profissionais */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Profissionais</p>
        {mantidos.length > 0 && (
          <div className="text-xs text-foreground">
            <strong>{mantidos.length}</strong> mantido(s): {mantidos.map((p) => p.nome).join(', ')}
          </div>
        )}
        {inclusoes.length > 0 && (
          <div className="text-xs text-success-600">
            + <strong>{inclusoes.length}</strong> inclusão(ões): {inclusoes.map((op) => op.dadosNovos?.nome).join(', ')}
          </div>
        )}
        {remocoes.length > 0 && (
          <div className="text-xs text-danger-600">
            - <strong>{remocoes.length}</strong> remoção(ões): {remocoes.map((op) => empresa.profissionais.find((p) => p.id === op.profissionalExistenteId)?.nome).join(', ')}
          </div>
        )}
        {substituicoes.length > 0 && (
          <div className="text-xs text-primary-600">
            ↔ <strong>{substituicoes.length}</strong> substituição(ões):
            {substituicoes.map((op) => {
              const antigo = empresa.profissionais.find((p) => p.id === op.profissionalExistenteId)?.nome
              const novo = op.dadosSubstituto?.nome
              return ` ${antigo} → ${novo}`
            }).join(';')}
          </div>
        )}
      </div>

      {/* Serviços */}
      {(adicoesServicos.length > 0 || remocoesServicos.length > 0 || desvinculacoes.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Serviços</p>
          {adicoesServicos.length > 0 && (
            <div className="text-xs text-success-600">
              + {adicoesServicos.length} adição(ões): {adicoesServicos.map((op) => op.dadosNovos?.nome).join(', ')}
            </div>
          )}
          {remocoesServicos.length > 0 && (
            <div className="text-xs text-danger-600">
              - {remocoesServicos.length} remoção(ões): {remocoesServicos.map((op) => empresa.servicos.find((s) => s.id === op.servicoExistenteId)?.nome).join(', ')}
            </div>
          )}
          {desvinculacoes.length > 0 && (
            <div className="text-xs text-muted-foreground">
              ↩ {desvinculacoes.length} desvinculação(ões)
            </div>
          )}
        </div>
      )}

      {/* Ocupação */}
      <div className="rounded-lg bg-muted p-3 space-y-1">
        <p className="text-xs font-medium text-foreground">Ocupação final prevista</p>
        <p className="text-sm">
          {ocupacao.atual} → <strong>{ocupacao.proposta}</strong> / {ocupacao.capacidade} profissionais
        </p>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-2 rounded-lg bg-warning-50 border border-warning-500/20 p-3">
        <AlertTriangle className="size-4 text-warning-600 shrink-0 mt-0.5" />
        <p className="text-xs text-warning-600">
          As alterações dependem de execução pelo responsável. Não serão aplicadas automaticamente.
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-2">
        <Button onClick={onEnviar} disabled={enviando}>
          {enviando ? 'Enviando...' : (
            <>
              <Send className="size-4" />
              Confirmar e enviar
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={onVoltar} disabled={enviando}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      </div>
    </div>
  )
}
