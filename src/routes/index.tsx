/* eslint-disable react-refresh/only-export-components -- este módulo declara e exporta a configuração do roteador */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { RouteGuard } from '@/components/layout/route-guard'
import { LoadingState } from '@/components/ui/state'

const LoginPage = lazy(() => import('@/pages/login').then((module) => ({ default: module.LoginPage })))
const RecuperarSenhaPage = lazy(() => import('@/pages/recuperar-senha').then((module) => ({ default: module.RecuperarSenhaPage })))
const DefinirSenhaPage = lazy(() => import('@/pages/definir-senha').then((module) => ({ default: module.DefinirSenhaPage })))
const VisaoGeralPage = lazy(() => import('@/pages/visao-geral').then((module) => ({ default: module.VisaoGeralPage })))
const AgendaPage = lazy(() => import('@/pages/agenda').then((module) => ({ default: module.AgendaPage })))
const AgendaDetalhePage = lazy(() => import('@/pages/agenda-detalhe').then((module) => ({ default: module.AgendaDetalhePage })))
const RelatoriosPage = lazy(() => import('@/pages/relatorios').then((module) => ({ default: module.RelatoriosPage })))
const AutomacoesPage = lazy(() => import('@/pages/automacoes').then((module) => ({ default: module.AutomacoesPage })))
const GestaoPage = lazy(() => import('@/pages/gestao').then((module) => ({ default: module.GestaoPage })))

function carregarPagina(page: ReactNode) {
  return <Suspense fallback={<LoadingState message="Carregando página..." />}>{page}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: carregarPagina(<LoginPage />),
  },
  {
    path: '/recuperar-senha',
    element: carregarPagina(<RecuperarSenhaPage />),
  },
  {
    path: '/redefinir-senha',
    element: carregarPagina(<DefinirSenhaPage modo="recuperacao" />),
  },
  {
    path: '/definir-senha',
    element: carregarPagina(<DefinirSenhaPage modo="primeiro-acesso" />),
  },
  {
    element: <RouteGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/agenda',
            element: carregarPagina(<AgendaPage />),
          },
          {
            path: '/agenda/:id',
            element: carregarPagina(<AgendaDetalhePage />),
          },
        ],
      },
    ],
  },
  {
    element: <RouteGuard allowedProfiles={['administrador']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/visao-geral',
            element: carregarPagina(<VisaoGeralPage />),
          },
          {
            path: '/relatorios',
            element: carregarPagina(<RelatoriosPage />),
          },
          {
            path: '/automacoes',
            element: carregarPagina(<AutomacoesPage />),
          },
          {
            path: '/gestao',
            element: carregarPagina(<GestaoPage />),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
], {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})
