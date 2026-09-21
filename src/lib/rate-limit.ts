const STORAGE_KEY = 'login_rate_limit'
const MAX_TENTATIVAS = 5
const BLOQUEIO_INICIAL_SEGUNDOS = 30
const BLOQUEIO_MAXIMO_SEGUNDOS = 300

interface RateLimitState {
  tentativas: number
  ultimoBloqueio: number | null
  bloqueioAte: number | null
}

function getState(): RateLimitState {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    // ignora erro de parse
  }
  return { tentativas: 0, ultimoBloqueio: null, bloqueioAte: null }
}

function setState(state: RateLimitState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function verificarBloqueio(): {
  bloqueado: boolean
  segundosRestantes: number
} {
  const state = getState()
  const agora = Date.now()

  if (state.bloqueioAte && state.bloqueioAte > agora) {
    return {
      bloqueado: true,
      segundosRestantes: Math.ceil((state.bloqueioAte - agora) / 1000),
    }
  }

  return { bloqueado: false, segundosRestantes: 0 }
}

export function registrarTentativa(sucesso: boolean): void {
  const state = getState()
  const agora = Date.now()

  if (sucesso) {
    setState({ tentativas: 0, ultimoBloqueio: null, bloqueioAte: null })
    return
  }

  state.tentativas += 1

  if (state.tentativas >= MAX_TENTATIVAS) {
    const tempoBloqueio = Math.min(
      BLOQUEIO_INICIAL_SEGUNDOS * Math.pow(2, state.tentativas - MAX_TENTATIVAS),
      BLOQUEIO_MAXIMO_SEGUNDOS
    )
    state.ultimoBloqueio = agora
    state.bloqueioAte = agora + tempoBloqueio * 1000
  }

  setState(state)
}

export function resetarTentativas(): void {
  setState({ tentativas: 0, ultimoBloqueio: null, bloqueioAte: null })
}

export function getTentativasRestantes(): number {
  const state = getState()
  return Math.max(0, MAX_TENTATIVAS - state.tentativas)
}
