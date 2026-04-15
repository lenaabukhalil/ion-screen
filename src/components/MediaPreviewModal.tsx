import { useState } from 'react'
import { formatDateTime } from '@/lib/dateFormat'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/StatusPill'
import type { MediaItem } from '@/services/mockData'

interface MediaPreviewModalProps {
  item: MediaItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}

export function MediaPreviewModal({ item, open, onOpenChange, onApprove, onReject }: MediaPreviewModalProps) {
  const [rejectMode, setRejectMode] = useState(false)
  const [reason, setReason] = useState('')
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Media Preview</DialogTitle>
          <DialogDescription>Review before approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {item.type === 'video' ? <video controls className="max-h-[60vh] w-full rounded-md object-contain" src={item.url} /> : <img src={item.url} alt={item.title} className="max-h-[60vh] w-full rounded-md object-contain" />}
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{item.title}</p>
            <div><StatusPill value={item.status} /></div>
            <p className="text-muted-foreground">Uploaded by: {item.uploaded_by}</p>
            <p className="text-muted-foreground">Created: {formatDateTime(item.created_at)}</p>
          </div>
          {rejectMode && <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter rejection reason" />}
        </div>
        {item.status === 'pending' && (
          <DialogFooter>
            {!rejectMode ? (
              <>
                <Button onClick={() => onApprove(item.media_id)} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                <Button variant="destructive" onClick={() => setRejectMode(true)}>Reject</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRejectMode(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => onReject(item.media_id, reason)}>Confirm Reject</Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
