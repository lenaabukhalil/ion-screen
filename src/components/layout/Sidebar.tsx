import { ImageIcon, LayoutDashboard, LogOut, Map } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { t } = useTranslation()
  const { isAdmin, user, logout } = useAuth()
  const isION = user?.organization_id === 1
  const showIONNav = isION || isAdmin

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
      isActive
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
    )

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-e border-border bg-gradient-to-b from-slate-50 to-white">
      <div className="border-b border-primary/20 px-4 py-4">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <img src="/ion-logo.png" alt="ION" className="h-6 w-6 object-contain" />
          <span className="text-primary">ION Screen</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {showIONNav ? (
          <div className="space-y-1 border-b border-primary/20 pb-3">
            <NavLink to="/dashboard" className={linkClass} end>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {t('dashboard.overview')}
            </NavLink>
          </div>
        ) : null}
        <div className="space-y-1 border-b border-primary/20 pb-3 pt-3">
          <NavLink to="/media" className={linkClass}>
            <ImageIcon className="h-4 w-4 shrink-0" />
            {t('nav.media')}
          </NavLink>
          <NavLink to="/map" className={linkClass}>
            <Map className="h-4 w-4 shrink-0" />
            {t('map.title')}
          </NavLink>
          {!showIONNav ? (
            <NavLink to="/media/upload" className={linkClass}>
              <ImageIcon className="h-4 w-4 shrink-0" />
              {t('pages.media_upload')}
            </NavLink>
          ) : null}
        </div>
        <button
          type="button"
          className="mt-auto flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            void logout()
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('topbar.logout')}
        </button>
      </nav>
    </aside>
  )
}
