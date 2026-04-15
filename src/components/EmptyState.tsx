import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">
      <div className="mx-auto mb-3 w-fit">{icon}</div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm">{description}</p>
    </div>
  )
}
