/* eslint-disable react-refresh/only-export-components -- contexto e hook formam uma única API de autenticação */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PerfilAcesso, Usuario, Empresa } from '@/types'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface ContextoPortalRpc {
  usuario_id: string
  nome_exibicao: string
  papel_acesso: PerfilAcesso
  empresa_id: string
  empresa_nome: string
  profissional_id: string | null
}

interface AuthContextType {
  usuario: Usuario | null
  empresa: Empresa | null
  perfil: PerfilAcesso | null
  loading: boolean
  configurado: boolean
  login: (email: string, senha: string) => Promise<{ sucesso: boolean; mensagem?: string; perfil?: PerfilAcesso }>
  logout: () => Promise<void>
  isAdmin: boolean
  isProfissional: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function normalizarContexto(data: unknown): ContextoPortalRpc | null {
  if (!data || typeof data !== 'object') return null
  const value = data as Record<string, unknown>
  if (
    typeof value.usuario_id !== 'string' ||
    typeof value.nome_exibicao !== 'string' ||
    (value.papel_acesso !== 'administrador' && value.papel_acesso !== 'profissional') ||
    typeof value.empresa_id !== 'string' ||
    typeof value.empresa_nome !== 'string'
  ) return null
  return value as unknown as ContextoPortalRpc
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configurado = isSupabaseConfigured()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(configurado)

  const limpar = useCallback(() => {
    setUsuario(null)
    setEmpresa(null)
  }, [])

  const carregarContexto = useCallback(async (): Promise<PerfilAcesso> => {
    const { data, error } = await supabase.rpc('obter_contexto_portal')
    if (error) throw new Error(error.message)
    const contexto = normalizarContexto(data)
    if (!contexto) throw new Error('Vínculo ativo com uma empresa não encontrado.')

    setUsuario({
      id: contexto.usuario_id,
      nome: contexto.nome_exibicao,
      perfil: contexto.papel_acesso,
      empresaId: contexto.empresa_id,
      profissionalId: contexto.profissional_id ?? undefined,
    })
    setEmpresa({ id: contexto.empresa_id, nome: contexto.empresa_nome })
    return contexto.papel_acesso
  }, [])

  useEffect(() => {
    if (!configurado) {
      return
    }

    let ativo = true
    const iniciar = async () => {
      const { data } = await supabase.auth.getSession()
      if (!ativo) return
      if (data.session) {
        try { await carregarContexto() } catch { limpar() }
      }
      if (ativo) setLoading(false)
    }
    void iniciar()

    const { data: listener } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') limpar()
    })
    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [carregarContexto, configurado, limpar])

  const login = useCallback(async (email: string, senha: string) => {
    if (!configurado) return { sucesso: false, mensagem: 'Supabase ainda não configurado.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) return { sucesso: false, mensagem: 'E-mail ou senha inválidos.' }
    try {
      const perfil = await carregarContexto()
      return { sucesso: true, perfil }
    } catch (errorContexto) {
      await supabase.auth.signOut()
      limpar()
      return {
        sucesso: false,
        mensagem: errorContexto instanceof Error ? errorContexto.message : 'Não foi possível carregar o vínculo da empresa.',
      }
    }
  }, [carregarContexto, configurado, limpar])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    limpar()
  }, [limpar])

  const value = useMemo<AuthContextType>(() => ({
    usuario,
    empresa,
    perfil: usuario?.perfil ?? null,
    loading,
    configurado,
    login,
    logout,
    isAdmin: usuario?.perfil === 'administrador',
    isProfissional: usuario?.perfil === 'profissional',
  }), [configurado, empresa, loading, login, logout, usuario])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
