import { supabase } from '@/lib/supabase'

const webhookUrl = import.meta.env.VITE_GESTAO_WEBHOOK_URL
const habilitado = import.meta.env.VITE_GESTAO_HABILITADA === 'true'

export interface EnviarSolicitacaoParams {
  jsonSolicitacao: string
  nomeSolicitante: string
  nomeEmpresa: string
}

function webhookValido(): boolean {
  if (!habilitado || !webhookUrl) return false
  try {
    const url = new URL(webhookUrl)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

export async function enviarSolicitacaoGestao(
  params: EnviarSolicitacaoParams
): Promise<{ sucesso: boolean; mensagem: string }> {
  if (!webhookValido()) {
    return { sucesso: false, mensagem: 'O envio de solicitações ainda não está configurado.' }
  }

  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    return { sucesso: false, mensagem: 'Sua sessão expirou. Entre novamente para enviar.' }
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        solicitante: params.nomeSolicitante,
        empresa: params.nomeEmpresa,
        solicitacao: JSON.parse(params.jsonSolicitacao),
      }),
    })

    const result: unknown = await response.json().catch(() => null)
    if (response.ok && result && typeof result === 'object' && 'sucesso' in result && result.sucesso === true) {
      return { sucesso: true, mensagem: 'Solicitação enviada com sucesso.' }
    }
    return { sucesso: false, mensagem: 'O n8n não confirmou o recebimento da solicitação.' }
  } catch {
    return { sucesso: false, mensagem: 'Não foi possível enviar a solicitação. Tente novamente.' }
  } finally {
    window.clearTimeout(timeout)
  }
}
