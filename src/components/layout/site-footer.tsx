import { cn } from '@/lib/utils'

interface SiteFooterProps {
  className?: string
}

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn('px-4 py-4 text-center text-xs leading-5 text-neutral-600', className)}>
      <p>Powered by Multiverso 360, 2026.</p>
      <p>Todos os direitos reservados.</p>
    </footer>
  )
}
