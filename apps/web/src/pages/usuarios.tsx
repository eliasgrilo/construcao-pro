import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { type UsuarioWithObras, useUsuarios } from '@/hooks/use-supabase'
import { cn, formatDate } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { EditDialog, InviteDialog, ROLE_LABELS, ROLE_VARIANTS } from './usuarios-dialogs'

export function UsuariosPage() {
  const { canManageUsers, isAdmin } = usePermissions()
  const { data: usuarios = [], isLoading } = useUsuarios()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser, setEditUser] = useState<UsuarioWithObras | null>(null)

  const columns = useMemo<ColumnDef<UsuarioWithObras>[]>(
    () => [
      {
        accessorKey: 'nome',
        header: 'Nome',
        cell: ({ row }) => {
          const u = row.original
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold flex-shrink-0',
                  u.ativo
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted-foreground/10 text-muted-foreground',
                )}
              >
                {u.nome?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-snug">
                  {u.nome}
                  {!u.ativo && (
                    <span className="ml-2 text-[11px] text-muted-foreground font-normal">
                      (inativo)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">{u.email}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'role',
        header: 'Perfil de Acesso',
        cell: ({ row }) => (
          <Badge variant={ROLE_VARIANTS[row.original.role] ?? 'secondary'}>
            {ROLE_LABELS[row.original.role] ?? row.original.role}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-2 w-2 rounded-full flex-shrink-0',
                row.original.ativo ? 'bg-green-500' : 'bg-muted-foreground/40',
              )}
            />
            <span
              className={cn(
                'text-[12px]',
                row.original.ativo ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
              )}
            >
              {row.original.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ),
      },
      {
        id: 'obras',
        header: 'Obras Atribuídas',
        cell: ({ row }) => {
          const obras = row.original.obras
          if (obras.length === 0) {
            return <span className="text-[12px] text-muted-foreground">Nenhuma obra atribuída</span>
          }
          return (
            <div className="flex items-center gap-1.5 flex-wrap max-w-[300px]">
              {obras.map((o) => (
                <Badge key={o.id} variant="outline" className="text-[11px]">
                  {o.nome}
                </Badge>
              ))}
            </div>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Data de Cadastro',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      ...(canManageUsers
        ? [
            {
              id: 'actions',
              header: '',
              cell: ({ row }: { row: { original: UsuarioWithObras } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Editar usuário ${row.original.nome}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditUser(row.original)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              ),
            } satisfies ColumnDef<UsuarioWithObras>,
          ]
        : []),
    ],
    [canManageUsers],
  )

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-[20px] font-semibold">Acesso Restrito</h2>
          <p className="text-[14px] text-muted-foreground mt-1">
            Apenas administradores podem gerenciar usuários.
          </p>
        </div>
      </div>
    )
  }

  const activeCount = usuarios.filter((u) => u.ativo).length
  const inactiveCount = usuarios.filter((u) => !u.ativo).length

  return (
    <div className="pb-10">
      <div className="px-4 md:px-8 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground text-[14px] mt-1">
              Gerencie os acessos e permissões do sistema
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="sm:h-10">
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            {
              label: 'Total',
              value: usuarios.length,
              icon: Users,
              color: 'text-primary bg-primary/10',
            },
            {
              label: 'Ativos',
              value: activeCount,
              icon: ShieldCheck,
              color: 'text-success bg-success/10',
            },
            {
              label: 'Inativos',
              value: inactiveCount,
              icon: AlertTriangle,
              color: 'text-muted-foreground bg-muted-foreground/10',
            },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn('flex h-9 w-9 items-center justify-center rounded-xl', stat.color)}
                >
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[22px] font-bold tabular-nums leading-none">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8">
        <DataTable
          columns={columns}
          data={usuarios}
          isLoading={isLoading}
          searchPlaceholder="Buscar por nome ou e-mail..."
          searchColumn="nome"
          pageSize={20}
          onRowClick={canManageUsers ? setEditUser : undefined}
        />
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditDialog user={editUser} onOpenChange={(v) => !v && setEditUser(null)} />
    </div>
  )
}
