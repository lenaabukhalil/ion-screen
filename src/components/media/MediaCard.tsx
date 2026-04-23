import { ImageIcon, Video } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/media/StatusBadge'
import type { MediaItem } from '@/lib/api/media'

interface MediaCardProps {
  item: MediaItem
}

export function MediaCard({ item }: MediaCardProps) {
  const isImage = item.media_type === 'image'

  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-3 aspect-video w-full overflow-hidden rounded-md bg-muted">
          {isImage ? (
            <img src={item.file_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Video className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="line-clamp-1 text-sm font-semibold">{item.title}</div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {isImage ? <ImageIcon className="inline h-3 w-3" /> : <Video className="inline h-3 w-3" />}
              <span className="ml-1 capitalize">{item.media_type}</span>
            </div>
            <StatusBadge status={item.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
