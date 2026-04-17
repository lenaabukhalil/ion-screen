import { LogOut, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import i18n from '@/i18n'

export function Topbar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  const initials =
    user != null
      ? `${user.f_name.charAt(0) ?? ''}${user.l_name.charAt(0) ?? ''}`.toUpperCase() || '?'
      : '?'

  function toggleLanguage() {
    const next = i18n.language === 'ar' ? 'en' : 'ar'
    void i18n.changeLanguage(next)
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <h2 className="text-lg font-semibold text-foreground">{t('app.name')}</h2>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={toggleLanguage}>
          {t('topbar.language')}: {i18n.language === 'ar' ? 'EN' : 'AR'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem
              onSelect={() => {
                toast.info(t('common.coming_soon'))
              }}
            >
              <User className="me-2 h-4 w-4" />
              {t('topbar.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void logout()
              }}
            >
              <LogOut className="me-2 h-4 w-4" />
              {t('topbar.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
