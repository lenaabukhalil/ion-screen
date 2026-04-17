import {
  CreditCard,
  ImageIcon,
  LayoutDashboard,
  Monitor,
  Upload,
  ClipboardCheck,
  Images,
  CalendarDays,
  MonitorPlay,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SidebarProps {
  role: 'admin' | 'partner'
}

export function Sidebar({ role }: SidebarProps) {
  const { t } = useTranslation()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )

  const partnerItems = (
    <>
      <NavLink to="/partner/dashboard" className={linkClass} end>
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        {t('nav.dashboard')}
      </NavLink>
      <NavLink to="/partner/media" className={linkClass}>
        <ImageIcon className="h-4 w-4 shrink-0" />
        {t('nav.media')}
      </NavLink>
      <NavLink to="/partner/media/upload" className={linkClass}>
        <Upload className="h-4 w-4 shrink-0" />
        {t('nav.media_upload')}
      </NavLink>
      <NavLink to="/partner/schedules" className={linkClass}>
        <CalendarDays className="h-4 w-4 shrink-0" />
        {t('nav.schedules')}
      </NavLink>
      <NavLink to="/partner/billing" className={linkClass}>
        <CreditCard className="h-4 w-4 shrink-0" />
        {t('nav.billing')}
      </NavLink>
    </>
  )

  const adminItems = (
    <>
      <NavLink to="/admin/dashboard" className={linkClass} end>
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        {t('nav.dashboard')}
      </NavLink>
      <NavLink to="/admin/approvals" className={linkClass}>
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        {t('nav.approvals')}
      </NavLink>
      <NavLink to="/admin/media" className={linkClass}>
        <Images className="h-4 w-4 shrink-0" />
        {t('nav.all_media')}
      </NavLink>
      <NavLink to="/admin/schedules" className={linkClass}>
        <CalendarDays className="h-4 w-4 shrink-0" />
        {t('nav.schedules')}
      </NavLink>
      <NavLink to="/admin/screens" className={linkClass}>
        <Monitor className="h-4 w-4 shrink-0" />
        {t('nav.screens')}
      </NavLink>
      <NavLink to="/admin/billing" className={linkClass}>
        <CreditCard className="h-4 w-4 shrink-0" />
        {t('nav.billing')}
      </NavLink>
    </>
  )

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-e border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <MonitorPlay className="h-6 w-6 text-primary" aria-hidden />
          <span>{t('app.name')}</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">{role === 'admin' ? adminItems : partnerItems}</nav>
    </aside>
  )
}
