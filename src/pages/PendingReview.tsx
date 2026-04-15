import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Film } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { StatusPill } from '@/components/StatusPill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRole } from '@/hooks/useRole'
import { formatDateTime } from '@/lib/dateFormat'
import { approveMedia, getPendingMedia, rejectMedia } from '@/services/api'
import type { MediaItem } from '@/services/mockData'

export default function PendingReview() {
  const { isAdmin } = useRole()
  const [mode, setMode] = useState<'queue' | 'table'>('queue')
  const [rows, setRows] = useState<MediaItem[]>([])
  const [index, setIndex] = useState(0)
  const [reason, setReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const current = rows[index]

  async function load() {
    const res = await getPendingMedia()
    if (!res.success || !res.data) return setError(res.message || 'Failed loading pending media')
    setRows(res.data)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setPreviewOpen(false)
    setShowReject(false)
    setReason('')
  }, [index])

  const count = useMemo(() => rows.length, [rows])

  async function doApprove(id: string) {
    const res = await approveMedia(id)
    if (!res.success) setError(res.message || 'Approve failed')
    await load()
  }

  async function doReject(id: string) {
    const res = await rejectMedia(id, reason)
    if (!res.success) setError(res.message || 'Reject failed')
    setReason('')
    setShowReject(false)
    await load()
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6 text-start">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Pending Review <Badge className="ml-2 bg-amber-500 text-white">{count}</Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Review pending media submissions.</p>
      </div>
      <div className="text-xs text-muted-foreground pt-5 pb-4 border-b border-border">ION Screen / Pending Review</div>
      <div className="flex gap-2">
        <Button variant={mode === 'queue' ? 'default' : 'outline'} onClick={() => setMode('queue')}>
          Queue View
        </Button>
        <Button variant={mode === 'table' ? 'default' : 'outline'} onClick={() => setMode('table')}>
          Table View
        </Button>
      </div>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      {mode === 'queue' ? (
        !current ? (
          <EmptyState icon={<Film className="h-6 w-6" />} title="No pending items" description="Queue is clear." />
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="relative aspect-video max-h-56 w-full overflow-hidden rounded-md border border-border bg-muted">
                {current.type === 'image' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="relative block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <img src={current.url} alt="" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-sm font-medium text-white opacity-0 transition-opacity hover:opacity-100">
                        Preview
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
                    <Film className="h-12 w-12 text-muted-foreground" />
                    <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
                      ▶ Preview
                    </Button>
                  </div>
                )}
              </div>

              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{current.title}</DialogTitle>
                  </DialogHeader>
                  {current.type === 'video' ? (
                    <video src={current.url} controls className="max-h-[70vh] w-full rounded-md object-contain" />
                  ) : (
                    <img src={current.url} alt={current.title} className="max-h-[70vh] w-full rounded-md object-contain" />
                  )}
                </DialogContent>
              </Dialog>

              <div>
                <p className="font-semibold text-lg">{current.title}</p>
                <p className="text-sm text-muted-foreground">
                  {current.uploaded_by} • {formatDateTime(current.created_at)}
                </p>
              </div>

              {showReject && (
                <Input placeholder="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => void doApprove(current.media_id)}>
                  ✓ Approve
                </Button>
                {showReject ? (
                  <Button className="w-full" variant="destructive" onClick={() => void doReject(current.media_id)}>
                    ✗ Confirm Reject
                  </Button>
                ) : (
                  <Button className="w-full" variant="destructive" onClick={() => setShowReject(true)}>
                    ✗ Reject
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" disabled={index === 0} onClick={() => setIndex((v) => Math.max(v - 1, 0))}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {index + 1} of {count}
                </span>
                <Button variant="outline" disabled={index >= count - 1} onClick={() => setIndex((v) => Math.min(v + 1, count - 1))}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Uploaded</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.media_id} className="border-b">
                    <td className="p-2">{r.title}</td>
                    <td className="p-2">
                      <StatusPill value={r.status} />
                    </td>
                    <td className="p-2">{formatDateTime(r.created_at)}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void doApprove(r.media_id)}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const val = window.prompt('Reason') || ''
                            if (val) void rejectMedia(r.media_id, val).then(() => load())
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
