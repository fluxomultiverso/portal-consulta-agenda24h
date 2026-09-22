import { cn } from '@/lib/utils'

interface BrandLogoProps {
  variant?: 'auth' | 'header'
  className?: string
}

export function BrandLogo({ variant = 'auth', className }: BrandLogoProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo-agenda24h.jpg`}
      alt="Agenda 24h — seu funcionário inteligente"
      className={cn(
        'rounded-full object-cover ring-1 ring-emerald-950/10',
        variant === 'auth'
          ? 'mx-auto size-28 shadow-sm sm:size-32'
          : 'size-10 shrink-0',
        className,
      )}
    />
  )
}
