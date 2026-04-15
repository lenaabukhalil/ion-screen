import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, CheckCircle, Clock, Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/StatusPill'
import { formatDateTime } from '@/lib/dateFormat'
import { getMedia, getStats } from '@/services/api'
import type { MediaItem, StatsResponse } from '@/services/mockData'

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [recent, setRecent] = useState<MediaItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, mediaRes] = await Promise.all([getStats(), getMedia({ status: 'pending', page: 1, limit: 5 })])
        if (statsRes.success && statsRes.data) setStats(statsRes.data)
        if (mediaRes.success && mediaRes.data) setRecent(mediaRes.data.items)
        if (!statsRes.success) setError(statsRes.message || 'Failed loading stats')
      } catch {
        setError('Failed loading dashboard')
      }
    }
    void load()
  }, [])

  const items = [
    { label: 'Total Media', value: stats?.total_media ?? '-', icon: BarChart3, color: 'text-amber-500' },
    { label: 'Pending Review', value: stats?.pending_count ?? '-', icon: Clock, color: 'text-amber-500' },
    { label: 'Approved', value: stats?.approved_count ?? '-', icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Screens Online', value: stats?.screens_online ?? '-', icon: Monitor, color: 'text-primary' },
  ]

  return (
    <div className="space-y-6 text-start">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Operational overview of screen media and screens.</p>
      </div>
      <div className="text-xs text-muted-foreground pt-5 pb-4 border-b border-border">ION Screen / Dashboard</div>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(({ label, value, icon: Icon, color }) => (
          <Card className="border border-border" key={label}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
              </div>
              <Icon className={`h-8 w-8 ${color} shrink-0`} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Pending Media</CardTitle>
          <Button asChild size="sm"><Link to="/pending">Review Now →</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="p-2 text-left">Title</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Uploaded By</th><th className="p-2 text-left">Date</th></tr></thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.media_id} className="border-b">
                    <td className="p-2">{item.title}</td>
                    <td className="p-2"><StatusPill value={item.status} /></td>
                    <td className="p-2">{item.uploaded_by}</td>
                    <td className="p-2">{formatDateTime(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
