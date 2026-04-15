import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Eye, Film, Search, Trash, Upload, XCircle } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { MediaPreviewModal } from '@/components/MediaPreviewModal'
import { PageTabs } from '@/components/PageTabs'
import { StatusPill } from '@/components/StatusPill'
import { TablePagination } from '@/components/TablePagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateTime } from '@/lib/dateFormat'
import { approveMedia, deleteMedia, getMedia, rejectMedia, uploadMedia } from '@/services/api'
import type { MediaItem } from '@/services/mockData'

const tabs = [{ id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }]

export default function MediaLibrary() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<MediaItem[]>([])
  const [preview, setPreview] = useState<MediaItem | null>(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      setError('')
      const res = await getMedia({ status: activeTab === 'all' ? undefined : activeTab, page, limit: perPage })
      if (!res.success || !res.data) return setError(res.message || 'Failed loading media')
      setRows(res.data.items)
      setTotal(res.data.total)
    } catch {
      setError('Failed loading media')
    }
  }

  useEffect(() => { void load() }, [activeTab, page, perPage])

  const filteredRows = useMemo(() => rows.filter((r) => r.title.toLowerCase().includes(search.toLowerCase())), [rows, search])

  return (
    <div className="space-y-6 text-start">
      <div><h1 className="text-2xl font-bold tracking-tight text-foreground">Media Library</h1><p className="text-sm text-muted-foreground mt-1">Upload and manage screen media.</p></div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => { setActiveTab(id); setPage(1) }} />
      <div className="text-xs text-muted-foreground pt-5 pb-4 border-b border-border">ION Screen / Media Library</div>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      <Card><CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" placeholder="Search media" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <UploadDialog onUploaded={load} />
        </div>
        {filteredRows.length === 0 ? <EmptyState icon={<Film className="h-6 w-6" />} title="No media found" description="Try changing your filters." /> : <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Thumbnail</th><th className="p-2 text-left">Title</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Organization</th><th className="p-2 text-left">Uploaded By</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Actions</th></tr></thead><tbody>
          {filteredRows.map((item) => <tr key={item.media_id} className="border-b"><td className="p-2">{item.type === 'video' ? <div className="h-[36px] w-[64px] rounded-md bg-muted flex items-center justify-center"><Film className="h-4 w-4" /></div> : <img src={item.url} alt={item.title} className="h-[36px] w-[64px] rounded-md object-cover" />}</td><td className="p-2">{item.title}</td><td className="p-2"><Badge className={item.type === 'image' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}>{item.type}</Badge></td><td className="p-2"><StatusPill value={item.status} /></td><td className="p-2 text-muted-foreground">{item.organization_name ?? (item.organization_id != null ? `Org ${item.organization_id}` : '—')}</td><td className="p-2">{item.uploaded_by}</td><td className="p-2">{formatDateTime(item.created_at)}</td><td className="p-2"><div className="flex items-center gap-2"><button onClick={() => setPreview(item)}><Eye className="h-4 w-4" /></button><button onClick={async () => { const r = await approveMedia(item.media_id); if (!r.success) setError(r.message || 'Approve failed'); void load() }}><CheckCircle className="h-4 w-4 text-emerald-600" /></button><button onClick={async () => { const reason = window.prompt('Rejection reason') || ''; if (!reason) return; const r = await rejectMedia(item.media_id, reason); if (!r.success) setError(r.message || 'Reject failed'); void load() }}><XCircle className="h-4 w-4 text-red-600" /></button><button onClick={async () => { const r = await deleteMedia(item.media_id); if (!r.success) setError(r.message || 'Delete failed'); void load() }}><Trash className="h-4 w-4" /></button></div></td></tr>)}
          </tbody></table>
        </div>}
        <TablePagination total={total} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} />
      </CardContent></Card>
      <MediaPreviewModal item={preview} open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)} onApprove={async (id) => { await approveMedia(id); setPreview(null); void load() }} onReject={async (id, reason) => { await rejectMedia(id, reason); setPreview(null); void load() }} />
    </div>
  )
}

function UploadDialog({ onUploaded }: { onUploaded: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [chargerId, setChargerId] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return setError('Please select a file')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title)
    if (chargerId) fd.append('charger_id', chargerId)
    const res = await uploadMedia(fd)
    if (!res.success) return setError(res.message || 'Upload failed')
    setOpen(false)
    await onUploaded()
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="bg-primary"><Upload className="h-4 w-4 mr-2" />Upload Media</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Upload Media</DialogTitle><DialogDescription>Add image or video file for screen playlist.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div><div><Label>Description (optional)</Label><Input /></div><div><Label>File</Label><Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div><div><Label>Charger ID (optional)</Label><Input value={chargerId} onChange={(e) => setChargerId(e.target.value)} /></div>{error ? <div className="text-sm text-destructive">{error}</div> : null}<DialogFooter><Button type="submit">Upload</Button></DialogFooter></form></DialogContent></Dialog>
}
