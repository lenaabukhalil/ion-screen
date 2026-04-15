import { LayoutGrid, LogOut, UploadCloud, type LucideIcon } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface PartnerSidebarProps {
  onNavigate?: () => void
}

interface NavItem {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
}

const items: NavItem[] = [
  { label: 'My Media', icon: LayoutGrid, to: '/', end: true },
  { label: 'Upload', icon: UploadCloud, to: '/upload' },
]

export function PartnerSidebar({ onNavigate }: PartnerSidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="flex h-full min-h-[100dvh] w-64 flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]">
      <div className="p-4 pb-2">
        <h2 className="text-base font-bold text-foreground">ION Screen</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Media Portal</p>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  )
}
