import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createObraSchema, type CreateObraInput } from '@/lib/schemas'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MapPin, Trash2, Building2, Warehouse, Landmark, FileText, Banknote, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useObras, useCreateObra, useDeleteObra, useDashboardCustoPorObra } from '@/hooks/use-supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

const statusMap: Record<string, { label: string; variant: 'success' | 'secondary' | 'warning' | 'info'; color: string }> = {
    ATIVA: { label: 'Ativa', variant: 'success', color: '#34C759' },
    FINALIZADA: { label: 'Finalizada', variant: 'secondary', color: '#8E8E93' },
    PAUSADA: { label: 'Pausada', variant: 'warning', color: '#FF9500' },
    VENDIDO: { label: 'Vendido', variant: 'info', color: '#5856D6' },
    TERRENO: { label: 'Terreno', variant: 'info', color: '#AF52DE' },
}

export function ObrasPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ATIVA' | 'PAUSADA' | 'FINALIZADA' | 'VENDIDO' | 'TERRENO'>('ALL')

    const { data: obrasData, isLoading } = useObras()
    const { data: custosData = [] } = useDashboardCustoPorObra()
    const createMutation = useCreateObra()
    const deleteMutation = useDeleteObra()

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateObraInput>({
        resolver: zodResolver(createObraSchema),
    })

    const counts = {
        ALL: obrasData?.length ?? 0,
        ATIVA: obrasData?.filter((o: any) => o.status === 'ATIVA').length ?? 0,
        PAUSADA: obrasData?.filter((o: any) => o.status === 'PAUSADA').length ?? 0,
        FINALIZADA: obrasData?.filter((o: any) => o.status === 'FINALIZADA').length ?? 0,
        VENDIDO: obrasData?.filter((o: any) => o.status === 'VENDIDO').length ?? 0,
        TERRENO: obrasData?.filter((o: any) => o.status === 'TERRENO').length ?? 0,
    }

    const obras = (obrasData || []).filter((o: any) => {
        const matchesSearch = !search || o.nome.toLowerCase().includes(search.toLowerCase()) || o.endereco.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const segments = [
        { key: 'ALL' as const, label: 'Todas', color: null },
        { key: 'TERRENO' as const, label: 'Terreno', color: '#AF52DE' },
        { key: 'ATIVA' as const, label: 'Ativa', color: '#34C759' },
        { key: 'PAUSADA' as const, label: 'Pausada', color: '#FF9500' },
        { key: 'FINALIZADA' as const, label: 'Finalizada', color: '#8E8E93' },
        { key: 'VENDIDO' as const, label: 'Vendido', color: '#5856D6' },
    ]

    return (
        <div className="pb-10">
            {/* Header */}
            <div className="px-4 md:px-8 pt-10 pb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Obras</h1>
                    <p className="text-[15px] text-muted-foreground mt-0.5">
                        {obras.length} obra{obras.length !== 1 ? 's' : ''}
                        {filterStatus !== 'ALL' && (
                            <span className="text-muted-foreground/60"> · {statusMap[filterStatus]?.label}</span>
                        )}
                    </p>
                </div>
                <Button onClick={() => setOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />Nova Obra
                </Button>
            </div>

            {/* Filter + Search */}
            <div className="mb-6 flex flex-col gap-3">
                {/* Segmented Control — scrollable strip, never wraps */}
                <div className="w-full overflow-x-auto scrollbar-hide px-4 md:px-8">
                    <div className="inline-flex items-center bg-muted rounded-[12px] p-1 gap-0.5 min-w-max">
                        {segments.map((seg) => (
                            <button
                                key={seg.key}
                                onClick={() => setFilterStatus(seg.key)}
                                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[13px] font-medium whitespace-nowrap"
                            >
                                {filterStatus === seg.key && (
                                    <motion.div
                                        layoutId="filter-pill"
                                        className="absolute inset-0 rounded-[9px] bg-background shadow-sm"
                                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                    />
                                )}
                                <span className={cn(
                                    'relative flex items-center gap-1.5 transition-colors duration-150',
                                    filterStatus === seg.key ? 'text-foreground' : 'text-muted-foreground',
                                )}>
                                    {seg.color && (
                                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                                    )}
                                    {seg.label}
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={counts[seg.key]}
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            transition={{ duration: 0.15 }}
                                            className={cn(
                                                'text-[11px] tabular-nums',
                                                filterStatus === seg.key ? 'text-muted-foreground' : 'text-muted-foreground/50',
                                            )}
                                        >
                                            {counts[seg.key]}
                                        </motion.span>
                                    </AnimatePresence>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 md:px-8">
                    <Input
                        placeholder="Buscar obras..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="px-4 md:px-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border bg-card p-6 animate-pulse space-y-4">
                                <div className="h-5 w-40 bg-muted rounded-lg" />
                                <div className="h-4 w-56 bg-muted rounded-lg" />
                                <div className="flex gap-6 pt-2"><div className="h-8 w-12 bg-muted rounded" /><div className="h-8 w-12 bg-muted rounded" /><div className="h-8 w-12 bg-muted rounded" /></div>
                            </div>
                        ))}
                    </div>
                ) : obras.length === 0 ? (
                    <div className="text-center py-20">
                        <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        {filterStatus !== 'ALL' || search ? (
                            <>
                                <p className="text-[17px] font-medium text-muted-foreground">Nenhuma obra encontrada</p>
                                <button
                                    onClick={() => { setFilterStatus('ALL'); setSearch('') }}
                                    className="text-[14px] text-primary mt-2 hover:underline"
                                >
                                    Limpar filtros
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-[17px] font-medium text-muted-foreground">Nenhuma obra cadastrada</p>
                                <p className="text-[15px] text-muted-foreground/70 mt-1">Crie sua primeira obra para começar</p>
                            </>
                        )}
                    </div>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                    >
                        {obras.map((obra: any) => {
                            const st = statusMap[obra.status] || statusMap.ATIVA
                            return (
                                <motion.div
                                    key={obra.id}
                                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                                    onClick={() => navigate({ to: '/obras/$obraId', params: { obraId: obra.id } })}
                                    className="group rounded-2xl bg-card p-5 cursor-pointer transition-colors hover:bg-accent/30"
                                >
                                    {/* Top */}
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="flex h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                                            <h3 className="text-[17px] font-semibold truncate">{obra.nome}</h3>
                                        </div>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 text-muted-foreground/50 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0"
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: obra.id, nome: obra.nome }) }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    {/* Address */}
                                    <div className="flex items-center gap-1.5 text-[15px] text-muted-foreground mb-3">
                                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="truncate">{obra.endereco}</span>
                                    </div>

                                    {/* Investimento */}
                                    {(() => {
                                        const custos = custosData.find((c: any) => c.id === obra.id)
                                        const vTerreno = obra.valor_terreno ?? 0
                                        const vBurocracia = obra.valor_burocracia ?? 0
                                        const vConstrucao = custos?.valor_construcao ?? obra.valor_construcao ?? 0
                                        const valorVenda = custos?.valor_venda ?? 0
                                        const totalInvestido = vTerreno + vBurocracia + vConstrucao
                                        const lucro = valorVenda - totalInvestido
                                        const isPositive = lucro >= 0
                                        return (
                                            <div className="mb-4 space-y-1.5">
                                                {[
                                                    { label: 'Terreno', Icon: Landmark, color: '#AF52DE', value: vTerreno, valueColor: vTerreno > 0 ? '#AF52DE' : undefined },
                                                    { label: 'Burocracia', Icon: FileText, color: '#007AFF', value: vBurocracia, valueColor: '#ffffff' },
                                                    { label: 'Construção', Icon: Building2, color: '#FF9500', value: vConstrucao, valueColor: '#ffffff' },
                                                ].map(({ label, Icon, color, value, valueColor }) => (
                                                    <div key={label} className="flex items-center gap-1.5">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
                                                            <Icon className="h-3.5 w-3.5" style={{ color }} />
                                                        </span>
                                                        <span className="text-[13px] text-muted-foreground">{label}</span>
                                                        <span className="text-[13px] font-semibold tabular-nums ml-auto" style={{ color: valueColor }}>
                                                            {formatCurrency(value)}
                                                        </span>
                                                    </div>
                                                ))}

                                                {/* Venda + Lucro for VENDIDO */}
                                                {obra.status === 'VENDIDO' && valorVenda > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-border/20 space-y-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: '#5856D618' }}>
                                                                <Banknote className="h-3.5 w-3.5" style={{ color: '#5856D6' }} />
                                                            </span>
                                                            <span className="text-[13px] text-muted-foreground">Venda</span>
                                                            <span className="text-[13px] font-semibold tabular-nums ml-auto" style={{ color: '#5856D6' }}>
                                                                {formatCurrency(valorVenda)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: isPositive ? '#34C75918' : '#FF3B3018' }}>
                                                                {isPositive
                                                                    ? <TrendingUp className="h-3.5 w-3.5" style={{ color: '#34C759' }} />
                                                                    : <TrendingDown className="h-3.5 w-3.5" style={{ color: '#FF3B30' }} />
                                                                }
                                                            </span>
                                                            <span className="text-[13px] text-muted-foreground">{isPositive ? 'Lucro' : 'Prejuízo'}</span>
                                                            <span className={cn('text-[13px] font-semibold tabular-nums ml-auto', isPositive ? 'text-success' : 'text-destructive')}>
                                                                {isPositive ? '+' : ''}{formatCurrency(lucro)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* Stats Bar */}
                                    <div className="flex items-center gap-4 pt-3 border-t border-border/30">
                                        <div className="flex items-center gap-1.5">
                                            <Warehouse className="h-4 w-4 text-muted-foreground/60" />
                                            <span className="text-[15px] font-semibold tabular-nums">{obra._count?.almoxarifados ?? 0}</span>
                                            <span className="text-[13px] text-muted-foreground">almox.</span>
                                        </div>
                                        {obra.custoTotal > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    'text-[15px] font-semibold tabular-nums',
                                                    (obra.percentualOrcamento ?? 0) > 90 ? 'text-destructive' :
                                                        (obra.percentualOrcamento ?? 0) > 70 ? 'text-warning' : 'text-success'
                                                )}>
                                                    {obra.percentualOrcamento ?? 0}%
                                                </span>
                                                <span className="text-[13px] text-muted-foreground">{formatCurrency(obra.custoTotal)}</span>
                                            </div>
                                        )}
                                        <Badge variant={st.variant} className="ml-auto">{st.label}</Badge>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Obra</DialogTitle>
                        <DialogDescription>Cadastre uma nova obra de construção.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit((d) => createMutation.mutate({ nome: d.nome, endereco: d.endereco, status: d.status, orcamento: d.orcamento, valorTerreno: d.valorTerreno }, {
                        onSuccess: () => {
                            setOpen(false)
                            reset()
                            toast({ title: 'Obra criada', variant: 'success' })
                        },
                        onError: () => {
                            toast({ title: 'Erro ao criar obra', description: 'Verifique os dados e tente novamente.', variant: 'error' })
                        },
                    }))} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome da Obra</Label>
                            <Input id="nome" {...register('nome')} placeholder="Ex: Edifício Horizonte" />
                            {errors.nome && <p className="text-[13px] text-destructive mt-1">{errors.nome.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endereco">Endereço</Label>
                            <Input id="endereco" {...register('endereco')} placeholder="Ex: Av. Paulista, 1000 - SP" />
                            {errors.endereco && <p className="text-[13px] text-destructive mt-1">{errors.endereco.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select defaultValue="ATIVA" onValueChange={(v) => setValue('status', v as any)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ATIVA">Ativa</SelectItem>
                                        <SelectItem value="TERRENO">Terreno</SelectItem>
                                        <SelectItem value="PAUSADA">Pausada</SelectItem>
                                        <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                                        <SelectItem value="VENDIDO">Vendido</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="orcamento">Orçamento (R$)</Label>
                                <Input id="orcamento" type="number" step="0.01" min="0" {...register('orcamento', { valueAsNumber: true })} placeholder="0,00" />
                                {errors.orcamento && <p className="text-[13px] text-destructive mt-1">{errors.orcamento.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valorTerreno" className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#AF52DE' }} />
                                Valor do Terreno (R$)
                            </Label>
                            <Input id="valorTerreno" type="number" step="0.01" min="0" {...register('valorTerreno', { valueAsNumber: true })} placeholder="0,00" />
                            {errors.valorTerreno && <p className="text-[13px] text-destructive mt-1">{errors.valorTerreno.message}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset() }}>Cancelar</Button>
                            <Button type="submit" loading={createMutation.isPending}>Criar Obra</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Excluir Obra</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, {
                            onSuccess: () => {
                                setDeleteTarget(null)
                                toast({ title: 'Obra excluída', variant: 'success' })
                            },
                            onError: () => {
                                toast({ title: 'Erro ao excluir', description: 'Esta obra pode ter almoxarifados e estoque vinculados.', variant: 'error' })
                            },
                        })} loading={deleteMutation.isPending}>
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
