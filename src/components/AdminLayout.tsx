import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { getPendingMedia } from '@/services/api'

export function AdminLayout() {
  const [pendingCount, setPendingCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    void getPendingMedia().then((res) => setPendingCount(res.data?.length || 0))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden flex items-center p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar pendingCount={pendingCount} />
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-64">
              <Sidebar pendingCount={pendingCount} onNavigate={() => setMobileOpen(false)} />
            </div>
            <button type="button" className="flex-1 bg-black/30" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          </div>
        )}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
