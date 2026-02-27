import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { Monitor, Moon, Sun } from 'lucide-react'

const roles: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  ALMOXARIFE: 'Almoxarife',
  VISUALIZADOR: 'Visualizador',
}

export function ConfiguracoesPage() {
  const { theme, setTheme } = useUIStore()
  const { user } = useAuthStore()

  const themes = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Escuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
  ]

  return (
    <div className="pb-10">
      <div className="px-4 md:px-8 pt-10 pb-6">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Configurações</h1>
      </div>

      <div className="px-4 md:px-8 space-y-5 max-w-2xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {[
                { label: 'Nome', value: user?.nome },
                { label: 'E-mail', value: user?.email },
                { label: 'Perfil', value: user?.role ? roles[user.role] || user.role : '—' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-[13px] text-muted-foreground">{label}</span>
                  <span className="text-[13px] font-medium">{value || '—'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="mb-3 block text-[13px] text-muted-foreground">Tema</Label>
            <div className="flex gap-2">
              {themes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value as any)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer',
                    theme === t.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border/50 bg-card hover:bg-accent/50 hover:border-border',
                  )}
                >
                  <t.icon
                    className={cn(
                      'h-5 w-5',
                      theme === t.value ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[12px] font-medium',
                      theme === t.value ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>Sobre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-[13px] font-medium">ConstruçãoPro v1.0.0</p>
            <p className="text-[12px] text-muted-foreground">
              Sistema de Gestão de Inventário para Construção Civil
            </p>
            <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/50">
              © 2026 ConstruçãoPro. Todos os direitos reservados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
