import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { LoadingState, UnauthorizedState } from '@/components/ui/state'
import type { PerfilAcesso } from '@/types'

interface RouteGuardProps {
  allowedProfiles?: PerfilAcesso[]
}

export function RouteGuard({ allowedProfiles }: RouteGuardProps) {
  const { usuario, loading } = useAuth()

  if (loading) return <LoadingState message="Validando acesso..." />

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (allowedProfiles && !allowedProfiles.includes(usuario.perfil)) {
    return <UnauthorizedState />
  }

  return <Outlet />
}
