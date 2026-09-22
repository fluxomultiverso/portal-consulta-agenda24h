import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { AuthPageShell } from '@/components/layout/auth-page-shell'
import {
  getTentativasRestantes,
  registrarTentativa,
  verificarBloqueio,
} from '@/lib/rate-limit'

export function LoginPage() {
  const { usuario, login, configurado, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [segundosBloqueio, setSegundosBloqueio] = useState(() => verificarBloqueio().segundosRestantes)

  useEffect(() => {
    if (segundosBloqueio <= 0) return

    const intervalo = window.setInterval(() => {
      const bloqueio = verificarBloqueio()
      setSegundosBloqueio(bloqueio.segundosRestantes)
      if (!bloqueio.bloqueado) setErro('')
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [segundosBloqueio])

  useEffect(() => {
    if (usuario) navigate(usuario.perfil === 'administrador' ? '/visao-geral' : '/agenda', { replace: true })
  }, [navigate, usuario])

  const handleEntrar = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !senha || entrando || !configurado) return

    const bloqueioAtual = verificarBloqueio()
    if (bloqueioAtual.bloqueado) {
      setSegundosBloqueio(bloqueioAtual.segundosRestantes)
      setErro(`Muitas tentativas. Aguarde ${bloqueioAtual.segundosRestantes} segundos para tentar novamente.`)
      return
    }

    setEntrando(true)
    setErro('')
    const resultado = await login(email.trim(), senha)
    setEntrando(false)
    if (!resultado.sucesso) {
      registrarTentativa(false)
      const novoBloqueio = verificarBloqueio()
      const restantes = getTentativasRestantes()
      setSegundosBloqueio(novoBloqueio.segundosRestantes)
      setErro(
        novoBloqueio.bloqueado
          ? `Muitas tentativas. Aguarde ${novoBloqueio.segundosRestantes} segundos para tentar novamente.`
          : `${resultado.mensagem ?? 'Não foi possível entrar.'} ${restantes === 1 ? 'Resta 1 tentativa.' : `Restam ${restantes} tentativas.`}`,
      )
      return
    }
    registrarTentativa(true)
    navigate(resultado.perfil === 'administrador' ? '/visao-geral' : '/agenda', { replace: true })
  }

  return (
    <AuthPageShell title="Agenda 24h" description="Portal de consulta e gerenciamento">
      <form onSubmit={handleEntrar} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          {!configurado && (
            <div className="rounded-lg bg-warning-50 border border-warning-500/20 p-3 flex items-start gap-2">
              <AlertTriangle className="size-4 text-warning-600 shrink-0 mt-0.5" />
              <p className="text-xs text-warning-600">A conexão com o Supabase ainda não foi configurada neste ambiente.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" required />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="senha" className="text-sm font-medium text-foreground">Senha</label>
              <Link to="/recuperar-senha" className="text-xs font-medium text-primary-600 hover:text-primary-700">Esqueci minha senha</Link>
            </div>
            <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" required />
          </div>
          {erro && <p className="text-sm text-danger-600" role="alert">{erro}</p>}
          <Button type="submit" className="w-full h-10" disabled={!configurado || loading || entrando || segundosBloqueio > 0 || !email.trim() || !senha}>
            {entrando && <Loader2 className="size-4 animate-spin" />}
            {entrando ? 'Entrando...' : segundosBloqueio > 0 ? `Tente novamente em ${segundosBloqueio}s` : 'Entrar'}
          </Button>
      </form>
    </AuthPageShell>
  )
}
