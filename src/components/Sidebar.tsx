import { Clock, Home, Image, LogOut, type LucideIcon } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useRole } from '@/hooks/useRole'
import { cn } from '@/lib/utils'

interface SidebarProps {
  pendingCount: number
  onNavigate?: () => void
}

interface NavItem {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
  showPending?: boolean
  /** Approve/reject queue — ION admin only (organization_id === 1). */
  adminOnly?: boolean
}

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Menu',
    items: [
      { label: 'Dashboard', icon: Home, to: '/', end: true },
      { label: 'Pending Review', icon: Clock, to: '/pending', showPending: true, adminOnly: true },
      { label: 'Media Library', icon: Image, to: '/media' },
    ],
  },
]

export function Sidebar({ pendingCount, onNavigate }: SidebarProps) {
  const { isAdmin } = useRole()
  const { logout } = useAuth()
  const navigate = useNavigate()
  if (!isAdmin) return null

  return (
    <aside className="flex h-full min-h-[100dvh] w-64 flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] p-4">
      <div className="mb-6 px-2">
        <h2 className="text-base font-semibold">ION Screen</h2>
        <p className="text-xs text-muted-foreground">Media Management</p>
      </div>
      <nav className="min-h-0 flex-1 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase px-3 py-1">{group.label}</p>
            <div className="space-y-1">
              {group.items
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                      )
                    }
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    {item.showPending && pendingCount > 0 ? <Badge className="bg-amber-500 text-white hover:bg-amber-500">{pendingCount}</Badge> : null}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-border pt-3">
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  )
}
