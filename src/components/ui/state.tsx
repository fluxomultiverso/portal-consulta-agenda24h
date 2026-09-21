import { AlertCircle, Inbox, Loader2, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3" role="status">
      <Loader2 className="size-8 animate-spin text-primary-500" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function EmptyState({ title, description }: StateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="rounded-full bg-muted p-3">
        <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
    </div>
  )
}

export function ErrorState({ title, description, action }: StateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="rounded-full bg-danger-50 p-3">
        <AlertCircle className="size-6 text-danger-500" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function UnauthorizedState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="rounded-full bg-warning-50 p-3">
        <ShieldX className="size-6 text-warning-500" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Acesso não autorizado</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Você não tem permissão para acessar esta página.
      </p>
    </div>
  )
}
