import { cn } from '@/lib/utils'

export function StatusPill({ value }: { value: string }) {
  const v = (value || '').toLowerCase()
  const cls =
    v === 'approved' || v === 'online' || v === 'available'
      ? 'bg-emerald-50 text-emerald-700'
      : v === 'pending'
        ? 'bg-amber-50 text-amber-700'
        : v === 'rejected' || v === 'error' || v === 'offline'
          ? 'bg-red-50 text-red-700'
          : 'bg-muted text-muted-foreground'
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium border-0', cls)}>{value}</span>
}
