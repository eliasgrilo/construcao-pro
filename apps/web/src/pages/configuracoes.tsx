import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePermissions } from '@/hooks/use-permissions'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Sun,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

const roles: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  ALMOXARIFE: 'Almoxarife',
  VISUALIZADOR: 'Visualizador',
}

const nomeSchema = z.string().min(2, 'Nome deve ter no mínimo 2 caracteres')

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export function ConfiguracoesPage() {
  const { theme, setTheme } = useUIStore()
  const { user, logout, updateProfile } = useAuthStore()
  const navigate = useNavigate()
  const { isAdmin } = usePermissions()

  // Edit profile state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(user?.nome ?? '')
  const [nameError, setNameError] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate({ to: '/login' })
    }
  }

  const handleSaveName = async () => {
    setNameError('')
    const result = nomeSchema.safeParse(editName.trim())
    if (!result.success) {
      setNameError(result.error.errors[0].message)
      return
    }

    setNameSaving(true)
    try {
      await updateProfile({ nome: editName.trim() })
      setNameSuccess(true)
      setIsEditingName(false)
      setTimeout(() => setNameSuccess(false), 2000)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Erro ao atualizar nome')
    } finally {
      setNameSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    const result = passwordSchema.safeParse({ newPassword, confirmPassword })
    if (!result.success) {
      setPasswordError(result.error.errors[0].message)
      return
    }

    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setTimeout(() => {
        setPasswordSuccess(false)
        setShowPasswordForm(false)
      }, 2500)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setPasswordSaving(false)
    }
  }

  const cancelEditName = () => {
    setIsEditingName(false)
    setEditName(user?.nome ?? '')
    setNameError('')
  }

  const cancelPasswordForm = () => {
    setShowPasswordForm(false)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
  }

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
              {/* Nome — editable */}
              <div className="flex justify-between items-center py-3 first:pt-0 gap-3">
                <span className="text-[13px] text-muted-foreground shrink-0">Nome</span>
                <AnimatePresence mode="wait">
                  {isEditingName ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2 flex-1 justify-end"
                    >
                      <div className="flex-1 max-w-[200px]">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-[13px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName()
                            if (e.key === 'Escape') cancelEditName()
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-[12px]"
                        onClick={cancelEditName}
                        disabled={nameSaving}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-[12px]"
                        onClick={handleSaveName}
                        loading={nameSaving}
                      >
                        Salvar
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-[13px] font-medium flex items-center gap-1.5">
                        {user?.nome || '—'}
                        {nameSuccess && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-success"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </motion.span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditName(user?.nome ?? '')
                          setIsEditingName(true)
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                        aria-label="Editar nome"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {nameError && (
                <p className="text-[12px] text-destructive pt-1 pb-2 border-none">{nameError}</p>
              )}

              {/* E-mail — read-only */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[13px] text-muted-foreground">E-mail</span>
                <span className="text-[13px] font-medium">{user?.email || '—'}</span>
              </div>

              {/* Perfil — read-only */}
              <div className="flex justify-between items-center py-3 last:pb-0">
                <span className="text-[13px] text-muted-foreground">Perfil</span>
                <span className="text-[13px] font-medium">
                  {user?.role ? roles[user.role] || user.role : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Segurança</CardTitle>
              {!showPasswordForm && !passwordSuccess && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[12px]"
                  onClick={() => setShowPasswordForm(true)}
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                  Alterar Senha
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {passwordSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10">
                    <Check className="h-4.5 w-4.5 text-success" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">Senha alterada com sucesso</p>
                    <p className="text-[11px] text-muted-foreground">
                      Sua nova senha já está ativa.
                    </p>
                  </div>
                </motion.div>
              ) : showPasswordForm ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleChangePassword}
                  className="space-y-4"
                >
                  {passwordError && (
                    <div className="rounded-lg bg-destructive/8 border border-destructive/15 p-3 text-[13px] text-destructive">
                      {passwordError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-[13px]">
                      Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 text-[14px] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-new-password" className="text-[13px]">
                      Confirmar Nova Senha
                    </Label>
                    <Input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 text-[14px]"
                    />
                  </div>

                  {/* Strength indicators */}
                  <div className="space-y-1.5">
                    {[
                      { label: 'Mínimo 6 caracteres', ok: newPassword.length >= 6 },
                      {
                        label: 'Senhas coincidem',
                        ok: newPassword.length > 0 && newPassword === confirmPassword,
                      },
                    ].map(({ label, ok }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div
                          className={`h-1.5 w-1.5 rounded-full transition-colors ${ok ? 'bg-success' : 'bg-muted-foreground/30'}`}
                        />
                        <span
                          className={`text-[12px] transition-colors ${ok ? 'text-success' : 'text-muted-foreground'}`}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-[13px]"
                      onClick={cancelPasswordForm}
                      disabled={passwordSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-9 text-[13px]"
                      loading={passwordSaving}
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                      Alterar Senha
                    </Button>
                  </div>
                </motion.form>
              ) : (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[13px] text-muted-foreground"
                >
                  Altere sua senha de acesso ao sistema.
                </motion.p>
              )}
            </AnimatePresence>
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
                  onClick={() => setTheme(t.value)}
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

        {/* Admin — User Management */}
        {isAdmin && (
          <Card
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate({ to: '/usuarios' })}
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium">Gerenciar Usuários</p>
                  <p className="text-[12px] text-muted-foreground">
                    Convidar, editar permissões e atribuir obras
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-11 text-[15px] text-destructive border-destructive/30 hover:bg-destructive/8 hover:border-destructive/50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
