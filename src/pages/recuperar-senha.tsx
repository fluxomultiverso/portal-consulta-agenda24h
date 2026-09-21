import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Calendar, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const handleEnviar = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || enviando || !isSupabaseConfigured()) return
    setEnviando(true)
    setErro('')

    const redirectTo = new URL(
      `${import.meta.env.BASE_URL}redefinir-senha`,
      window.location.origin,
    ).toString()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setEnviando(false)

    if (error) {
      setErro('Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.')
      return
    }
    setEnviado(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center rounded-2xl bg-primary-100 p-3">
            <Calendar className="size-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">Enviaremos um link para o e-mail do seu acesso.</p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          {enviado ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto size-10 text-success-600" />
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground">Verifique seu e-mail</h2>
                <p className="text-sm text-muted-foreground">
                  Se houver um usuário ativo para esse endereço, você receberá um link para definir uma nova senha.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full h-10">
                <Link to="/login">Voltar ao login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEnviar} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email-recuperacao" className="text-sm font-medium text-foreground">E-mail</label>
                <input
                  id="email-recuperacao"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  required
                />
              </div>
              {erro && <p className="text-sm text-danger-600" role="alert">{erro}</p>}
              {!isSupabaseConfigured() && (
                <p className="text-sm text-warning-600">A conexão com o Supabase ainda não está configurada.</p>
              )}
              <Button type="submit" className="w-full h-10" disabled={!email.trim() || enviando || !isSupabaseConfigured()}>
                {enviando && <Loader2 className="size-4 animate-spin" />}
                {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                Voltar ao login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
