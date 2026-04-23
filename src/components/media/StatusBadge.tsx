import { Badge } from '@/components/ui/badge'
import type { MediaStatus } from '@/lib/api/media'

interface StatusBadgeProps {
  status: MediaStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'approved') {
    return <Badge className="bg-green-600 text-white hover:bg-green-600">Approved</Badge>
  }
  if (status === 'rejected') {
    return <Badge variant="destructive">Rejected</Badge>
  }
  return <Badge className="bg-amber-500 text-black hover:bg-amber-500">Pending</Badge>
}
