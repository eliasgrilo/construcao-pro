import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { Bell, Monitor, Moon, Sun } from 'lucide-react'

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  const { theme, setTheme } = useUIStore()

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-6 bg-background/80 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="text-[15px] font-semibold truncate">{title}</h1>
        {description && <p className="text-[12px] text-muted-foreground truncate">{description}</p>}
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <Button variant="ghost" size="icon" className="relative" title="Notificações">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
        <Button variant="ghost" size="icon" onClick={cycleTheme} title={`Tema: ${theme}`}>
          <ThemeIcon className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
