import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertTriangle, Calendar, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface DefinirSenhaPageProps {
  modo: 'primeiro-acesso' | 'recuperacao'
}

export function DefinirSenhaPage({ modo }: DefinirSenhaPageProps) {
  const navigate = useNavigate()
  const configurado = isSupabaseConfigured()
  const [validando, setValidando] = useState(configurado)
  const [sessaoValida, setSessaoValida] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!configurado) return

    let ativo = true
    const verificar = async () => {
      const { data } = await supabase.auth.getSession()
      if (!ativo) return
      setSessaoValida(Boolean(data.session))
      setValidando(false)
    }
    void verificar()

    const { data: listener } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN') {
        setSessaoValida(Boolean(session))
        setValidando(false)
      }
    })
    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [configurado])

  const senhaValida = senha.length >= 8
  const senhasIguais = senha === confirmacao

  const handleSalvar = async (event: FormEvent) => {
    event.preventDefault()
    if (!sessaoValida || !senhaValida || !senhasIguais || salvando) return
    setSalvando(true)
    setErro('')
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setErro('Não foi possível salvar a senha. Solicite um novo link e tente novamente.')
      setSalvando(false)
      return
    }
    setConcluido(true)
    setSalvando(false)
    await supabase.auth.signOut()
  }

  const titulo = modo === 'primeiro-acesso' ? 'Definir senha' : 'Criar nova senha'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center rounded-2xl bg-primary-100 p-3">
            <Calendar className="size-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{titulo}</h1>
          <p className="text-sm text-muted-foreground">Use pelo menos 8 caracteres.</p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          {validando ? (
            <div className="flex flex-col items-center gap-3 py-6" role="status">
              <Loader2 className="size-8 animate-spin text-primary-600" />
              <p className="text-sm text-muted-foreground">Validando o link...</p>
            </div>
          ) : concluido ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto size-10 text-success-600" />
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground">Senha salva</h2>
                <p className="text-sm text-muted-foreground">Agora você já pode entrar no portal.</p>
              </div>
              <Button className="w-full h-10" onClick={() => navigate('/login', { replace: true })}>Ir para o login</Button>
            </div>
          ) : !sessaoValida ? (
            <div className="space-y-4 text-center">
              <AlertTriangle className="mx-auto size-10 text-warning-600" />
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground">Link inválido ou expirado</h2>
                <p className="text-sm text-muted-foreground">Solicite um novo link de recuperação para continuar.</p>
              </div>
              <Button asChild variant="outline" className="w-full h-10">
                <Link to="/recuperar-senha">Solicitar novo link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="nova-senha" className="text-sm font-medium text-foreground">Nova senha</label>
                <div className="relative">
                  <input id="nova-senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" value={senha} onChange={(event) => setSenha(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 pr-11 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" minLength={8} required />
                  <button type="button" onClick={() => setMostrarSenha((atual) => !atual)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                    {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {senha && !senhaValida && <p className="text-xs text-warning-600">A senha precisa ter pelo menos 8 caracteres.</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirmar-senha" className="text-sm font-medium text-foreground">Confirmar senha</label>
                <input id="confirmar-senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" minLength={8} required />
                {confirmacao && !senhasIguais && <p className="text-xs text-danger-600">As senhas não coincidem.</p>}
              </div>
              {erro && <p className="text-sm text-danger-600" role="alert">{erro}</p>}
              <Button type="submit" className="w-full h-10" disabled={!senhaValida || !senhasIguais || salvando}>
                {salvando && <Loader2 className="size-4 animate-spin" />}
                {salvando ? 'Salvando...' : 'Salvar senha'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
