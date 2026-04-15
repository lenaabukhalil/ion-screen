import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { PartnerSidebar } from '@/components/PartnerSidebar'
import { Button } from '@/components/ui/button'

export function PartnerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="lg:hidden flex items-center justify-between border-b border-border px-3 py-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold text-foreground flex-1 text-center">ION Screen</span>
        <div className="w-10 shrink-0" aria-hidden />
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="hidden lg:block">
          <PartnerSidebar />
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-64 shadow-lg">
              <PartnerSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
            <button type="button" className="flex-1 bg-black/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          </div>
        )}
        <main className="flex-1 w-full min-w-0 p-5 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
