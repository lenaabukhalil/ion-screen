import { useEffect, useMemo, useState } from 'react'
import { CirclePlay, Download, ImageOff, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { PageTabs } from '@/components/PageTabs'
import { StatusPill } from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { formatDateTime } from '@/lib/dateFormat'
import { getMedia } from '@/services/api'
import type { MediaItem } from '@/services/mockData'

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
]

export default function MyMedia() {
  const { user } = useAuth()
  const organizationId = user?.organization_id
  const [items, setItems] = useState<MediaItem[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [error, setError] = useState('')

  async function load() {
    if (organizationId == null) return
    try {
      setError('')
      const res = await getMedia({ organizationId, page: 1, limit: 100 })
      if (!res.success || !res.data) {
        setError(res.message || 'Failed loading media')
        return
      }
      setItems(res.data.items)
    } catch {
      setError('Failed loading media')
    }
  }

  useEffect(() => {
    void load()
  }, [organizationId])

  const stats = useMemo(() => {
    const total = items.length
    const approved = items.filter((i) => i.status === 'approved').length
    const pending = items.filter((i) => i.status === 'pending').length
    const rejected = items.filter((i) => i.status === 'rejected').length
    return { total, approved, pending, rejected }
  }, [items])

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items
    return items.filter((i) => i.status === activeTab)
  }, [items, activeTab])

  return (
    <div className="space-y-8 text-start">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My Media</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage your uploaded content</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 h-10 px-5" asChild>
          <Link to="/upload" className="inline-flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload New
          </Link>
        </Button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Total</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground">items</p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400/90">Approved</p>
          <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.approved}</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-amber-900/80 dark:text-amber-400/90">Pending</p>
          <p className="text-xl font-bold tabular-nums text-amber-800 dark:text-amber-400 mt-0.5">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-red-200/80 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-red-800 dark:text-red-400/90">Rejected</p>
          <p className="text-xl font-bold tabular-nums text-red-700 dark:text-red-400 mt-0.5">{stats.rejected}</p>
        </div>
      </div>

      <PageTabs tabs={filterTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<ImageOff className="h-8 w-8" />}
          title="No media yet"
          description="Upload images or videos to see them here after submission."
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<ImageOff className="h-8 w-8" />}
          title="Nothing in this filter"
          description="Try another tab or upload new content."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <Card key={item.media_id} className="overflow-hidden border border-border shadow-sm rounded-xl flex flex-col">
              <div className="relative aspect-video bg-zinc-900 shrink-0 rounded-t-xl overflow-hidden">
                <div className="absolute right-2 top-2 z-10">
                  <StatusPill value={item.status} />
                </div>
                {item.type === 'video' ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/90">
                    <CirclePlay className="h-14 w-14 opacity-90" strokeWidth={1.25} />
                    <span className="text-xs font-medium uppercase tracking-wide text-white/70">Video</span>
                  </div>
                ) : (
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col bg-card p-4 rounded-b-xl border-t border-border/60">
                <h3 className="font-semibold text-foreground truncate pr-1" title={item.title}>
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(item.created_at)}</p>
                {item.status === 'rejected' && item.rejection_reason ? (
                  <p className="text-xs text-red-500 italic mt-3 line-clamp-2" title={item.rejection_reason}>
                    {item.rejection_reason}
                  </p>
                ) : (
                  <div className="mt-3 flex-1 min-h-[0]" />
                )}
                {item.status === 'approved' ? (
                  <Button
                    className="mt-4 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    asChild
                  >
                    <a href={item.url} download target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
