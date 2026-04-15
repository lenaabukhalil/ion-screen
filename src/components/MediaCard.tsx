import { Eye, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/StatusPill'
import type { MediaItem } from '@/services/mockData'

interface MediaCardProps {
  item: MediaItem
  onPreview: (item: MediaItem) => void
  onApprove: (item: MediaItem) => void
  onReject: (item: MediaItem) => void
  onDelete: (item: MediaItem) => void
}

export function MediaCard({ item, onPreview, onApprove, onReject, onDelete }: MediaCardProps) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4 space-y-3">
        <img src={item.url} alt={item.title} className="h-36 w-full rounded-md object-cover" />
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground truncate">{item.title}</p>
          <StatusPill value={item.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onPreview(item)}><Eye className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => onApprove(item)}><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button>
          <Button variant="outline" size="icon" onClick={() => onReject(item)}><XCircle className="h-4 w-4 text-red-600" /></Button>
          <Button variant="outline" size="icon" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  )
}
