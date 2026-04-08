import { Button } from '@/components/ui/button'
import { CurrencyInput, parseCurrency } from '@/components/ui/currency-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StickyFooter } from '@/components/ui/sticky-footer'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useCreateObraLancamentoBurocracia,
  useDeleteObraLancamentoBurocracia,
} from '@/hooks/use-supabase'
import { cn, formatCurrency, formatDate, formatDateShort } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Banknote,
  FileText,
  Landmark,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ObraLancamentoBurocracia } from './obra-detail'
import { Empty, burocCatConfig, burocMigrationSql } from './obra-detail'

export interface ObraDetailBurocraciaTabProps {
  obraId: string
  burocLoading: boolean
  lancamentosBurocracia: ObraLancamentoBurocracia[]
  bTotalGeral: number
  burocError: boolean
}

export function ObraDetailBurocraciaTab({
  obraId,
  burocLoading,
  lancamentosBurocracia,
  bTotalGeral,
  burocError,
}: ObraDetailBurocraciaTabProps) {
  const { toast } = useToast()
  const { canManageObras } = usePermissions()

  // Local State
  const [burocSearch, setBurocSearch] = useState('')
  const [burocFilter, setBurocFilter] = useState<string | null>(null)

  // Modal State
  const [burocAddOpen, setBurocAddOpen] = useState(false)
  const [burocDeleteTarget, setBurocDeleteTarget] = useState<{
    id: string
    descricao: string
  } | null>(null)
  const [burocCategoria, setBurocCategoria] = useState<'banco' | 'vendas' | 'impostos' | 'taxas'>(
    'banco',
  )
  const [burocDescricao, setBurocDescricao] = useState('')
  const [burocValor, setBurocValor] = useState('')
  const [burocData, setBurocData] = useState(() => {
    const d = new Date()
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
  })

  // Mutations
  const createBurocracia = useCreateObraLancamentoBurocracia()
  const deleteBurocracia = useDeleteObraLancamentoBurocracia()

  // Local Computations (previously in root)
  const bFiltered = useMemo(() => {
    return lancamentosBurocracia.filter((l) => {
      if (burocFilter && l.categoria !== burocFilter) return false
      if (burocSearch && !l.descricao.toLowerCase().includes(burocSearch.toLowerCase())) {
        return false
      }
      return true
    })
  }, [lancamentosBurocracia, burocFilter, burocSearch])

  const bTotalByCategoria = useMemo(() => {
    return (['banco', 'vendas', 'impostos', 'taxas'] as const).map((cat) => ({
      cat,
      total: lancamentosBurocracia
        .filter((l) => l.categoria === cat)
        .reduce((acc, curr) => acc + (curr.valor ?? 0), 0),
    }))
  }, [lancamentosBurocracia])

  const resetBurocAdd = () => {
    setBurocAddOpen(false)
    setBurocCategoria('banco')
    setBurocDescricao('')
    setBurocValor('')
    const d = new Date()
    setBurocData(
      [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-'),
    )
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Burocracia</h2>
          {!burocLoading && lancamentosBurocracia.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {lancamentosBurocracia.length} lançamento
              {lancamentosBurocracia.length !== 1 ? 's' : ''} · {formatCurrency(bTotalGeral)}
            </p>
          )}
        </div>
        {!burocError && canManageObras && (
          <Button size="sm" onClick={() => setBurocAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Lançamento
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {burocLoading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border p-4 space-y-3 animate-pulse">
                <div className="h-8 w-8 rounded-[10px] bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-3 w-12 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 px-5 py-4 border-b border-border/50 last:border-0 animate-pulse"
              >
                <div className="h-10 w-10 rounded-[12px] bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
                <div className="h-4 w-20 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error state — table not yet created in Supabase */}
      {burocError && !burocLoading && (
        <div className="flex flex-col gap-5 max-w-sm mx-auto w-full">
          <div className="flex flex-col items-center text-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </span>
            <div className="space-y-1.5">
              <p className="text-[15px] font-semibold">Migration pendente no Supabase</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                A tabela de Burocracia ainda não existe no banco. Siga os 3 passos abaixo — são
                menos de 1 minuto.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/50">
            {/* Step 1 */}
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-background text-[11px] font-bold flex-shrink-0 mt-0.5">
                1
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium">Copie o SQL abaixo</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(burocMigrationSql)
                      .then(() => toast({ title: 'SQL copiado!', variant: 'success' }))
                      .catch(() => toast({ title: 'Não foi possível copiar', variant: 'error' }))
                  }}
                  className="mt-1.5 flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium hover:bg-accent transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  Copiar SQL da migration
                </button>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-background text-[11px] font-bold flex-shrink-0 mt-0.5">
                2
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium">Abra o SQL Editor do Supabase</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-[14px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Recarregar após executar o SQL
          </button>
        </div>
      )}

      {!burocLoading && !burocError && (
        <>
          {/* Summary cards — tappable as filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bTotalByCategoria.map(({ cat, total }) => {
              const cfg = burocCatConfig[cat]
              const CatIcon = cfg.icon
              const isActive = burocFilter === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setBurocFilter(isActive ? null : cat)}
                  className={cn(
                    'flex flex-col gap-2.5 rounded-2xl border p-4 text-left transition-all active:scale-[0.97]',
                    isActive ? 'shadow-sm' : 'hover:bg-accent/40',
                  )}
                  style={isActive ? { borderColor: cfg.color, borderWidth: 2 } : undefined}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: `${cfg.color}18` }}
                  >
                    <CatIcon className="h-4 w-4" style={{ color: cfg.color }} />
                  </span>
                  <div>
                    <p
                      className="text-[18px] font-semibold tabular-nums leading-tight"
                      style={isActive ? { color: cfg.color } : undefined}
                    >
                      {formatCurrency(total)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cfg.label}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Search bar */}
          <Input
            icon={Search}
            type="search"
            value={burocSearch}
            onChange={(e) => setBurocSearch(e.target.value)}
            placeholder="Buscar lançamento..."
          />

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
            {([null, 'banco', 'vendas', 'impostos', 'taxas'] as const).map((f) => {
              const cfg = f ? burocCatConfig[f] : null
              const active = burocFilter === f
              return (
                <button
                  key={f ?? 'todos'}
                  type="button"
                  onClick={() => setBurocFilter(f)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-all',
                    active && !cfg && 'bg-foreground text-background border-foreground',
                    !active &&
                      'bg-transparent text-muted-foreground border-border hover:text-foreground',
                  )}
                  style={
                    active && cfg
                      ? {
                          backgroundColor: cfg.color,
                          borderColor: cfg.color,
                          color: '#fff',
                        }
                      : undefined
                  }
                >
                  {cfg && <cfg.icon className="h-3 w-3" />}
                  {cfg ? cfg.label : 'Todos'}
                </button>
              )
            })}
          </div>

          {/* Transaction list */}
          {bFiltered.length === 0 ? (
            <Empty
              icon={FileText}
              text={
                burocSearch || burocFilter
                  ? 'Nenhum lançamento encontrado'
                  : 'Nenhum lançamento registrado'
              }
              sub={
                burocSearch || burocFilter
                  ? 'Tente ajustar os filtros.'
                  : 'Toque em "Novo Lançamento" para começar.'
              }
            />
          ) : (
            <div className="rounded-2xl border bg-card overflow-hidden">
              <ul className="divide-y divide-border/50">
                {bFiltered.map((l) => {
                  const cfg = burocCatConfig[l.categoria] ?? burocCatConfig.banco
                  const CatIcon = cfg.icon
                  return (
                    <li key={l.id} className="group flex items-center gap-3.5 px-4 sm:px-5 py-3.5">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-[12px] flex-shrink-0"
                        style={{ backgroundColor: `${cfg.color}16` }}
                      >
                        <CatIcon className="h-[17px] w-[17px]" style={{ color: cfg.color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium line-clamp-2">{l.descricao}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {cfg.label} · {formatDateShort(l.data)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-[14px] font-semibold tabular-nums">
                          {formatCurrency(l.valor ?? 0)}
                        </p>
                        {/* Always visible on mobile, hover-only on desktop */}
                        {canManageObras && (
                          <button
                            type="button"
                            onClick={() =>
                              setBurocDeleteTarget({ id: l.id, descricao: l.descricao })
                            }
                            className="flex h-11 w-11 sm:h-7 sm:w-7 items-center justify-center rounded-full hover:bg-destructive/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                            aria-label="Excluir lançamento"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ── Burocracia: Add Dialog ── */}
      <Dialog
        open={burocAddOpen}
        onOpenChange={(v) => {
          if (!v && !createBurocracia.isPending) resetBurocAdd()
        }}
      >
        <DialogContent className="p-0 sm:p-0 flex flex-col !overflow-hidden sm:max-w-sm max-w-[100vw]">
          {/* Custom header */}
          <div className="shrink-0 flex items-center justify-between px-5 pt-2 pb-4 border-b border-border/40 sm:pt-5 overflow-hidden">
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[12px] flex-shrink-0"
                style={{ background: 'rgba(0,122,255,0.10)' }}
              >
                <FileText className="h-5 w-5" style={{ color: '#007AFF' }} />
              </span>
              <div className="min-w-0">
                <DialogTitle>Novo Lançamento</DialogTitle>
                <p className="text-[13px] text-muted-foreground mt-0.5 leading-tight">
                  Registre um item financeiro de burocracia.
                </p>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Registre um item financeiro de burocracia.
            </DialogDescription>
            <motion.button
              type="button"
              onClick={() => {
                if (!createBurocracia.isPending) resetBurocAdd()
              }}
              disabled={createBurocracia.isPending}
              whileTap={{ scale: 0.86 }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-40 transition-opacity flex-shrink-0 ml-3"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>

          {/* Scrollable body — vertical only, no horizontal scroll */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 space-y-6 py-6"
            style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
          >
            {/* ── Categoria: large tappable cards 2×2 ── */}
            <div className="space-y-3 overflow-hidden">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Categoria
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {(['banco', 'vendas', 'impostos', 'taxas'] as const).map((cat) => {
                  const cfg = burocCatConfig[cat]
                  const CatIcon = cfg.icon
                  const active = burocCategoria === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBurocCategoria(cat)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 py-5 transition-all active:scale-[0.96] min-w-0',
                        active ? '' : 'border-border/50 bg-muted/10 hover:bg-accent/30',
                      )}
                      style={
                        active
                          ? { borderColor: cfg.color, backgroundColor: `${cfg.color}14` }
                          : undefined
                      }
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-[14px] flex-shrink-0"
                        style={{ backgroundColor: active ? `${cfg.color}22` : `${cfg.color}12` }}
                      >
                        <CatIcon className="h-5 w-5" style={{ color: cfg.color }} />
                      </span>
                      <span
                        className={cn(
                          'text-[14px] font-semibold truncate max-w-full',
                          !active && 'text-muted-foreground',
                        )}
                        style={active ? { color: cfg.color } : undefined}
                      >
                        {cfg.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Valor — prominent primary field ── */}
            <div className="space-y-2 overflow-hidden">
              <Label>Valor</Label>
              <CurrencyInput
                value={burocValor}
                onChange={(e) => setBurocValor(e.target.value)}
                placeholder="0,00"
              />
            </div>

            {/* ── Descrição ── */}
            <div className="space-y-2 overflow-hidden">
              <Label>Descrição</Label>
              <Input
                value={burocDescricao}
                onChange={(e) => setBurocDescricao(e.target.value)}
                placeholder="Ex: ITBI, registro em cartório, certidões..."
                maxLength={120}
              />
              <p className="text-[11px] text-muted-foreground/60 text-right tabular-nums">
                {burocDescricao.length}/120
              </p>
            </div>

            {/* ── Data ── */}
            <div className="space-y-2 overflow-hidden">
              <Label>Data</Label>
              <Input type="date" value={burocData} onChange={(e) => setBurocData(e.target.value)} />
            </div>
          </div>

          {/* Animated footer — hidden when keyboard is open */}
          <StickyFooter>
            <div className="flex flex-col gap-3 px-5 pt-4 pb-[var(--modal-pb,max(1.25rem,env(safe-area-inset-bottom)))] border-t border-border/40 sm:flex-row sm:justify-end sm:gap-2 overflow-hidden">
              <Button
                type="button"
                variant="outline"
                onClick={resetBurocAdd}
                className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!burocDescricao.trim() || parseCurrency(burocValor) <= 0}
                loading={createBurocracia.isPending}
                onClick={() =>
                  createBurocracia.mutate(
                    {
                      obra_id: obraId,
                      categoria: burocCategoria,
                      descricao: burocDescricao.trim(),
                      valor: parseCurrency(burocValor),
                      data: burocData,
                    },
                    {
                      onSuccess: () => {
                        toast({ title: 'Lançamento registrado', variant: 'success' })
                        resetBurocAdd()
                      },
                      onError: (err: Error) =>
                        toast({
                          title: 'Erro ao registrar lançamento',
                          description: err?.message ?? 'Verifique a conexão e tente novamente.',
                          variant: 'error',
                        }),
                    },
                  )
                }
                className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
              >
                Registrar
              </Button>
            </div>
          </StickyFooter>
        </DialogContent>
      </Dialog>

      {/* ── Burocracia: Delete Dialog ── */}
      <Dialog
        open={!!burocDeleteTarget}
        onOpenChange={(v) => {
          if (!v && !deleteBurocracia.isPending) setBurocDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Lançamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{burocDeleteTarget?.descricao}</strong>? Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBurocDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleteBurocracia.isPending}
              onClick={() =>
                burocDeleteTarget &&
                deleteBurocracia.mutate(
                  { id: burocDeleteTarget.id, obraId },
                  {
                    onSuccess: () => {
                      toast({ title: 'Lançamento excluído', variant: 'success' })
                      setBurocDeleteTarget(null)
                    },
                    onError: (err: Error) =>
                      toast({
                        title: 'Erro ao excluir lançamento',
                        description: err?.message ?? 'Verifique a conexão e tente novamente.',
                        variant: 'error',
                      }),
                  },
                )
              }
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
