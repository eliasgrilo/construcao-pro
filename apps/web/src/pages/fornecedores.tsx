import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFornecedorSchema, type CreateFornecedorInput } from '@/lib/schemas'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Phone, Mail, MapPin, Building } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useFornecedores, useCreateFornecedor, useDeleteFornecedor } from '@/hooks/use-supabase'
import { useToast } from '@/components/ui/toast'

export function FornecedoresPage() {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)

    const { data: fornecedoresData, isLoading } = useFornecedores()
    const createMutation = useCreateFornecedor()
    const deleteMutation = useDeleteFornecedor()

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateFornecedorInput>({
        resolver: zodResolver(createFornecedorSchema),
    })

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'nome', header: 'Fornecedor',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-accent/60 flex-shrink-0">
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div>
                        <span className="font-medium text-[13px]">{row.original.nome}</span>
                        {row.original.cnpj && (
                            <p className="text-[11px] text-muted-foreground font-mono">{row.original.cnpj}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'telefone', header: 'Contato',
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    {row.original.telefone && (
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{row.original.telefone}</span>
                        </div>
                    )}
                    {row.original.email && (
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{row.original.email}</span>
                        </div>
                    )}
                    {!row.original.telefone && !row.original.email && (
                        <span className="text-muted-foreground">—</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'endereco', header: 'Endereço',
            cell: ({ row }) => row.original.endereco ? (
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground max-w-[200px]">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{row.original.endereco}</span>
                </div>
            ) : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: 'ativo', header: 'Status',
            cell: ({ row }) => (
                <Badge variant={row.original.ativo ? 'success' : 'destructive'}>
                    {row.original.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
            ),
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: row.original.id, nome: row.original.nome })} className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            ),
        },
    ]

    return (
        <div className="pb-10">
            <div className="px-4 md:px-8 pt-10 pb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Fornecedores</h1>
                    <p className="text-[13px] text-muted-foreground mt-0.5">Cadastro e gestão de fornecedores</p>
                </div>
                <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1.5" />Novo Fornecedor</Button>
            </div>
            <div className="px-4 md:px-8">
                <DataTable columns={columns} data={fornecedoresData || []} isLoading={isLoading} searchPlaceholder="Buscar fornecedores..." />
            </div>

            {/* ── Criar Fornecedor ── */}
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo Fornecedor</DialogTitle>
                        <DialogDescription>Cadastre o fornecedor para vincular às entradas de estoque.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit((d) => createMutation.mutate(d, {
                        onSuccess: () => { setOpen(false); reset(); toast({ title: 'Fornecedor cadastrado', variant: 'success' }) },
                        onError: () => { toast({ title: 'Erro ao cadastrar', variant: 'error' }) }
                    }))} className="space-y-5">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label>Nome / Razão Social</Label>
                            <Input {...register('nome')} placeholder="Ex: Votorantim Cimentos" />
                            {errors.nome && <p className="text-[13px] text-destructive mt-1">{errors.nome.message}</p>}
                        </div>

                        {/* CNPJ */}
                        <div className="space-y-2">
                            <Label>CNPJ <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <Input {...register('cnpj')} placeholder="00.000.000/0000-00" />
                        </div>

                        {/* Telefone */}
                        <div className="space-y-2">
                            <Label>Telefone <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <Input {...register('telefone')} placeholder="(11) 99999-9999" />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label>Email <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <Input type="email" {...register('email')} placeholder="contato@fornecedor.com" />
                            {errors.email && <p className="text-[13px] text-destructive mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Endereço */}
                        <div className="space-y-2">
                            <Label>Endereço <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <Input {...register('endereco')} placeholder="Rua, número, bairro, cidade" />
                        </div>

                        {/* Observação */}
                        <div className="space-y-2">
                            <Label>Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <Input {...register('observacao')} placeholder="Informações adicionais" />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset() }}>Cancelar</Button>
                            <Button type="submit" loading={createMutation.isPending}>Cadastrar Fornecedor</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Excluir ── */}
            <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Excluir Fornecedor</DialogTitle>
                        <DialogDescription>Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Essa ação não pode ser desfeita.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, {
                            onSuccess: () => { setDeleteTarget(null); toast({ title: 'Fornecedor excluído', variant: 'success' }) },
                            onError: () => { toast({ title: 'Erro ao excluir', description: 'Este fornecedor pode estar vinculado a movimentações.', variant: 'error' }) }
                        })} loading={deleteMutation.isPending}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
