import { Outlet, NavLink, useNavigate } from 'react-router'
import {
  Calendar,
  BarChart3,
  Bot,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/visao-geral', label: 'Visão geral', icon: LayoutDashboard, adminOnly: true },
  { to: '/agenda', label: 'Agenda', icon: Calendar, adminOnly: false },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, adminOnly: true },
  { to: '/automacoes', label: 'Automações', icon: Bot, adminOnly: true },
  { to: '/gestao', label: 'Gestão', icon: Users, adminOnly: true },
]

export function AppLayout() {
  const { usuario, empresa, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const itemsVisiveis = navItems.filter((item) => !item.adminOnly || isAdmin)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {empresa?.nome ?? 'Agenda 24h'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-foreground">{usuario?.nome}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{usuario?.perfil}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Sair"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="pb-20 md:pb-4">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Outlet />
        </div>
      </main>

      {/* Navegação inferior mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white md:hidden safe-bottom">
        <div className="flex items-center justify-around">
          {itemsVisiveis.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 px-3 text-xs font-medium transition-colors min-w-[64px]',
                  isActive
                    ? 'text-primary-600'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 flex-col border-r bg-white p-4">
        <nav className="flex flex-col gap-1">
          {itemsVisiveis.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuário autenticado */}
        <div className="mt-auto pt-4 border-t">
          <div className="rounded-lg bg-muted p-3">
            <p className="truncate text-sm font-medium text-foreground">{usuario?.nome}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {usuario?.perfil}
            </p>
          </div>
        </div>
      </aside>

      {/* Ajuste do conteúdo para sidebar desktop */}
      <style>{`
        @media (min-width: 768px) {
          main { margin-left: 14rem; }
        }
      `}</style>
    </div>
  )
}
