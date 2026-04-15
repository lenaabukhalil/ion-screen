import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
}

interface PageTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
}

export function PageTabs({ tabs, activeTab, onTabChange }: PageTabsProps) {
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn('px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2', isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
