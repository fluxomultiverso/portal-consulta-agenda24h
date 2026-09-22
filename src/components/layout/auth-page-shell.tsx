import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/layout/brand-logo'
import { SiteFooter } from '@/components/layout/site-footer'

interface AuthPageShellProps {
  title: string
  description: string
  children: ReactNode
}

export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-gray-50">
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-sm space-y-5">
          <header className="space-y-2 text-center">
            <BrandLogo />
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </header>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
