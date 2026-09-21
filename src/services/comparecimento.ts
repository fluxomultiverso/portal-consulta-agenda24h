import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Atendimento, RespostaComparecimento } from '@/types'

type Sucesso = {
  sucesso: true; agendamento_id: string; status: 'concluido' | 'faltou'
  concluido_em: string | null; faltou_em: string | null; repeticao: boolean; mensagem: string
}
type Resultado = Sucesso | { sucesso: false; codigo: string; mensagem: string }
type Tentativa = { solicitacao_id: string; agendamento_id: string; resposta: RespostaComparecimento }
const webhookUrl = import.meta.env.VITE_COMPARECIMENTO_WEBHOOK_URL ||
  'https://n8n.multiverso360.com.br/webhook/agenda24h/comparecimento/v1'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emAndamento = new Set<string>()
const mensagens: Record<string, string> = {
  RECURSO_INDISPONIVEL: 'Registro de comparecimento temporariamente indisponível.',
  NAO_AUTENTICADO: 'Faça login para registrar o comparecimento.',
  SEM_PERMISSAO: 'Você não tem permissão para registrar este atendimento.',
  ANTES_DO_INICIO: 'O registro estará disponível a partir do início do atendimento.',
  ESTADO_INCOMPATIVEL: 'Este atendimento não aceita essa alteração. Atualize a agenda.',
  SOLICITACAO_REUTILIZADA: 'Esta tentativa não pode ser alterada. Atualize a agenda.',
  LEMBRETE_EM_PROCESSAMENTO: 'Há uma notificação em processamento. Tente novamente em instantes.',
  LIMITE_REQUISICOES: 'Aguarde um momento antes de tentar novamente.',
  ENTRADA_INVALIDA: 'Não foi possível identificar o atendimento para registrar o resultado.',
  RESULTADO_INCERTO: 'Não foi possível confirmar a gravação. Tente novamente com a mesma resposta.',
  TENTATIVA_PENDENTE: 'Há uma tentativa sem confirmação. Repita a resposta anterior antes de escolher outra.',
  ARMAZENAMENTO_INDISPONIVEL: 'Não foi possível preparar uma tentativa segura. Verifique o armazenamento do navegador.',
}
const falha = (codigo: string): Resultado => ({ sucesso: false, codigo,
  mensagem: mensagens[codigo] || 'Não foi possível registrar o resultado. Tente novamente.' })

export function comparecimentoHabilitado(): boolean {
  try {
    const url = new URL(webhookUrl)
    return import.meta.env.VITE_COMPARECIMENTO_HABILITADO === 'true' &&
      isSupabaseConfigured() && url.protocol === 'https:' && !url.username && !url.password
  } catch { return false }
}
export function podeRegistrarComparecimento(dataHora: string): boolean {
  return Date.now() >= new Date(dataHora).getTime()
}
export function tempoRestanteParaLiberaçao(dataHora: string): number {
  const inicio = new Date(dataHora).getTime()
  return Number.isFinite(inicio) ? Math.max(0, inicio - Date.now()) : Infinity
}
export function aplicarResultadoComparecimento(atendimento: Atendimento, resultado: Sucesso): Atendimento {
  return { ...atendimento,
    situacao: resultado.status === 'concluido' ? 'atendimento_concluido' : 'cliente_faltou',
    concluidoEm: resultado.concluido_em, faltouEm: resultado.faltou_em }
}
function resultadoValido(value: unknown, id: string, resposta: RespostaComparecimento): value is Sucesso {
  if (!value || typeof value !== 'object') return false
  const r = value as Record<string, unknown>
  const timestamp = resposta === 'sim' ? r.concluido_em : r.faltou_em
  return r.sucesso === true && r.agendamento_id === id &&
    r.status === (resposta === 'sim' ? 'concluido' : 'faltou') &&
    typeof r.repeticao === 'boolean' && typeof timestamp === 'string' &&
    Number.isFinite(Date.parse(timestamp)) &&
    (resposta === 'sim' ? r.faltou_em === null : r.concluido_em === null)
}
export async function registrarComparecimento(agendamentoId: string, resposta: RespostaComparecimento): Promise<Resultado> {
  if (!comparecimentoHabilitado()) return falha('RECURSO_INDISPONIVEL')
  if (!uuid.test(agendamentoId) || !['sim', 'nao'].includes(resposta)) return falha('ENTRADA_INVALIDA')
  // A sessão fornece o token; a validação definitiva acontece no servidor.
  let session
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session || data.session.user.is_anonymous) return falha('NAO_AUTENTICADO')
    session = data.session
  } catch { return falha('NAO_AUTENTICADO') }
  const chave = `agenda24h:comparecimento:v1:${session.user.id}:${agendamentoId}`
  if (emAndamento.has(chave)) return falha('TENTATIVA_PENDENTE')
  let tentativa: Tentativa
  try {
    const anterior = sessionStorage.getItem(chave)
    if (anterior) {
      tentativa = JSON.parse(anterior)
      if (!tentativa || !uuid.test(tentativa.solicitacao_id) || tentativa.agendamento_id !== agendamentoId ||
        !['sim', 'nao'].includes(tentativa.resposta)) return falha('ARMAZENAMENTO_INDISPONIVEL')
      if (tentativa.resposta !== resposta) return falha('TENTATIVA_PENDENTE')
    } else {
      tentativa = { solicitacao_id: crypto.randomUUID(), agendamento_id: agendamentoId, resposta }
      sessionStorage.setItem(chave, JSON.stringify(tentativa))
    }
  } catch { return falha('ARMAZENAMENTO_INDISPONIVEL') }
  emAndamento.add(chave)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  const limpar = () => { try { sessionStorage.removeItem(chave) } catch { /* retry continua seguro */ } }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(tentativa), signal: controller.signal,
    })
    const result: unknown = await response.json()
    if (response.status === 200 && resultadoValido(result, agendamentoId, resposta)) {
      limpar()
      return { ...result, mensagem: result.status === 'concluido'
        ? 'Atendimento registrado como concluído.' : 'Falta do cliente registrada.' }
    }
    // 5xx/resposta inesperada pode ocorrer depois do COMMIT: manter a tentativa.
    if (response.status >= 400 && response.status < 500 && result && typeof result === 'object' &&
      'sucesso' in result && result.sucesso === false) {
      const codigo = 'codigo' in result && typeof result.codigo === 'string' ? result.codigo : ''
      if (Object.hasOwn(mensagens, codigo) && codigo !== 'RESULTADO_INCERTO') {
        // Preservar a chave também em erros conhecidos permite renovar login e repetir.
        return falha(codigo)
      }
    }
    return falha('RESULTADO_INCERTO')
  } catch { return falha('RESULTADO_INCERTO') }
  finally { clearTimeout(timeout); emAndamento.delete(chave) }
}
