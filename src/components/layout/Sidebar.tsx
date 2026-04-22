import { BatteryCharging, Building2, LayoutDashboard, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-e border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <BatteryCharging className="h-6 w-6 text-primary" aria-hidden />
          <span>ION Screen</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <NavLink to="/dashboard" className={linkClass} end>
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {t('nav.dashboard')}
        </NavLink>
        <NavLink to="/locations" className={linkClass}>
          <MapPin className="h-4 w-4 shrink-0" />
          {t('nav.locations')}
        </NavLink>
        <NavLink to="/chargers" className={linkClass}>
          <BatteryCharging className="h-4 w-4 shrink-0" />
          {t('nav.chargers')}
        </NavLink>
        {isAdmin ? (
          <NavLink to="/organizations" className={linkClass}>
            <Building2 className="h-4 w-4 shrink-0" />
            {t('nav.organizations')}
          </NavLink>
        ) : null}
      </nav>
    </aside>
  )
}
