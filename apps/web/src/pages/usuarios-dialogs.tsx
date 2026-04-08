import { Badge } from '@/components/ui/badge'
/**
 * usuarios-dialogs.tsx
 * InviteDialog + EditDialog extraídos de usuarios.tsx
 */
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { type UsuarioWithObras, useObras, useUpdateUsuarioWithObras } from '@/hooks/use-supabase'
import { type InviteUsuarioInput, inviteUsuarioSchema } from '@/lib/schemas'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

// ─── Role Config ──────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  ALMOXARIFE: 'Almoxarife',
  VISUALIZADOR: 'Visualizador',
}

export const ROLE_VARIANTS: Record<string, 'default' | 'info' | 'warning' | 'secondary'> = {
  ADMIN: 'default',
  GESTOR: 'info',
  ALMOXARIFE: 'warning',
  VISUALIZADOR: 'secondary',
}

export const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administrador', desc: 'Acesso total ao sistema' },
  { value: 'GESTOR', label: 'Gestor', desc: 'Gestão de obras e financeiro' },
  { value: 'ALMOXARIFE', label: 'Almoxarife', desc: 'Gestão de estoque e materiais' },
  { value: 'VISUALIZADOR', label: 'Visualizador', desc: 'Somente leitura' },
]

// ─── Invite Dialog ────────────────────────────────────────
export function InviteDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteUsuarioInput>({
    resolver: zodResolver(inviteUsuarioSchema),
    mode: 'onTouched',
    defaultValues: { role: 'VISUALIZADOR' },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: InviteUsuarioInput) => {
    setIsSubmitting(true)
    try {
      const { data: result, error } = await supabase.functions.invoke('invite-user', {
        body: { email: data.email, nome: data.nome, role: data.role },
      })

      if (error) throw new Error(error.message ?? 'Erro ao convidar usuário.')
      if (result?.error) throw new Error(result.error as string)

      toast({ title: `Convite enviado para ${data.email}`, variant: 'success' })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Erro ao convidar usuário',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Usuário</DialogTitle>
          <DialogDescription>
            Um e-mail de acesso será enviado para o novo usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-nome">Nome</Label>
            <Input
              id="invite-nome"
              placeholder="Nome completo"
              {...register('nome')}
              className="h-11 text-[15px]"
            />
            {errors.nome && <p className="text-[12px] text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="usuario@empresa.com"
              {...register('email')}
              className="h-11 text-[15px]"
            />
            {errors.email && <p className="text-[12px] text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Perfil de Acesso</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setValue('role', v as InviteUsuarioInput['role'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <span className="font-medium">{r.label}</span>
                      <span className="text-muted-foreground ml-2 text-[11px]">{r.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-[12px] text-destructive">{errors.role.message}</p>}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={isSubmitting}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar Convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Dialog ──────────────────────────────────────────
export function EditDialog({
  user,
  onOpenChange,
}: { user: UsuarioWithObras | null; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast()
  const updateUsuarioWithObras = useUpdateUsuarioWithObras()
  const { data: obras = [] } = useObras()
  const currentUser = useAuthStore((s) => s.user)

  const [nome, setNome] = useState('')
  const [role, setRole] = useState<string>('VISUALIZADOR')
  const [ativo, setAtivo] = useState(true)
  const [selectedObras, setSelectedObras] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      setNome(user.nome)
      setRole(user.role)
      setAtivo(user.ativo)
      setSelectedObras(user.obras.map((o) => o.id))
    }
  }, [user?.id])

  const isSelf = currentUser?.id === user?.id

  const handleSave = async () => {
    if (!user) return

    try {
      await updateUsuarioWithObras.mutateAsync({
        id: user.id,
        nome,
        role,
        ativo,
        obraIds: selectedObras,
      })
      toast({ title: 'Usuário atualizado', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao atualizar', variant: 'error' })
    }
  }

  const toggleObra = (obraId: string) => {
    setSelectedObras((prev) =>
      prev.includes(obraId) ? prev.filter((id) => id !== obraId) : [...prev, obraId],
    )
  }

  const isSaving = updateUsuarioWithObras.isPending

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            {user?.email}
            {isSelf && <span className="ml-2 text-[11px] text-warning font-medium">(Você)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-nome">Nome</Label>
            <Input
              id="edit-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 text-[15px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Perfil de Acesso</Label>
            <Select value={role} onValueChange={setRole} disabled={isSelf}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-[11px] text-muted-foreground">
                Você não pode alterar seu próprio perfil
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-[13px] font-medium">Conta Ativa</p>
              <p className="text-[11px] text-muted-foreground">
                Desativar impede o login do usuário
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ativo}
              disabled={isSelf}
              onClick={() => setAtivo(!ativo)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                ativo ? 'bg-primary' : 'bg-muted-foreground/30',
                isSelf && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  ativo ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>

          <div className="space-y-2">
            <Label>Obras Atribuídas</Label>
            <p className="text-[11px] text-muted-foreground">
              Selecione as obras que este usuário pode acessar. Admins e Gestores têm acesso a
              todas.
            </p>
            <div className="max-h-48 overflow-y-auto rounded-xl border divide-y">
              {obras.length === 0 && (
                <p className="p-3 text-[13px] text-muted-foreground text-center">
                  Nenhuma obra cadastrada
                </p>
              )}
              {obras.map((obra) => {
                const checked = selectedObras.includes(obra.id)
                return (
                  <button
                    key={obra.id}
                    type="button"
                    onClick={() => toggleObra(obra.id)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors',
                      'hover:bg-accent/50',
                      checked && 'bg-primary/5',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-md border transition-colors flex-shrink-0',
                        checked ? 'bg-primary border-primary text-white' : 'border-border',
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{obra.nome}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {obra.endereco}
                      </p>
                    </div>
                    <Badge
                      variant={
                        obra.status === 'ATIVA'
                          ? 'success'
                          : obra.status === 'PAUSADA'
                            ? 'warning'
                            : 'secondary'
                      }
                      className="flex-shrink-0"
                    >
                      {obra.status}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSave} loading={isSaving}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
