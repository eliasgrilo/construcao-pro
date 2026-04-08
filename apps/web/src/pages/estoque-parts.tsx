import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { accents } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Building2,
  ChevronRight,
  Filter,
  MapPin,
  Package,
} from 'lucide-react'
import type { EstoqueItem, ObraGroup } from './estoque-types'

// ── Animation variants ─────────────────────────────────────────────────────────
export const obraGroupListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
} as const

export const obraGroupItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
} as const

// ── Totals type ────────────────────────────────────────────────────────────────
export interface EstoqueTotals {
  items: number
  qty: number
  cost: number
  obras: number
  lowStock: number
}

// ── EstoqueLoadingSkeleton ─────────────────────────────────────────────────────
export function EstoqueLoadingSkeleton() {
  return (
    <div className="pb-10">
      <div className="px-4 md:px-8 pt-10 pb-6">
        <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-56 bg-muted rounded-lg animate-pulse mt-2" />
      </div>
      <div className="px-4 md:px-8 space-y-4">
        <div className="rounded-[20px] bg-card border h-[160px] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={String(i)}
              className="rounded-[20px] bg-card border h-[140px] animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── EstoqueHeroCard ────────────────────────────────────────────────────────────
export function EstoqueHeroCard({
  totals,
  onClick,
}: {
  totals: EstoqueTotals
  onClick: () => void
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onClick={onClick}
      className="w-full text-left rounded-[20px] bg-card border shadow-sm shadow-black/[0.03] p-6 md:p-8 transition-transform active:scale-[0.98] group"
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}
        >
          <Boxes className="h-6 w-6 text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">
            Estoque Geral
          </p>
          <p className="text-[32px] md:text-[40px] font-bold tabular-nums tracking-tight leading-none mt-2">
            {formatCurrency(totals.cost)}
          </p>
          <p className="text-[15px] text-muted-foreground mt-2">em materiais</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1.5 text-[12px] font-medium">
          <Package className="h-3 w-3 text-muted-foreground" />
          {formatNumber(totals.items)} itens
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1.5 text-[12px] font-medium">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          {totals.obras} obra{totals.obras !== 1 ? 's' : ''}
        </span>
        {totals.lowStock > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 text-warning px-3 py-1.5 text-[12px] font-medium">
            <AlertTriangle className="h-3 w-3" />
            {totals.lowStock} alerta{totals.lowStock !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </motion.button>
  )
}

// ── ObraGroupGrid ──────────────────────────────────────────────────────────────
export function ObraGroupGrid({
  obraGroups,
  onSelect,
  onEntrada,
}: {
  obraGroups: ObraGroup[]
  onSelect: (obraId: string) => void
  onEntrada: () => void
}) {
  if (obraGroups.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Estoque vazio"
        description="Registre uma entrada de material para começar a controlar o estoque"
        action={{ label: '+ Registrar entrada', onClick: onEntrada }}
      />
    )
  }

  return (
    <>
      <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Por Obra
      </h3>
      <motion.div
        initial="hidden"
        animate="show"
        variants={obraGroupListVariants}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {obraGroups.map((group, i) => {
          const accent = accents[i % accents.length]
          return (
            <motion.button
              key={group.obraId}
              variants={obraGroupItemVariants}
              onClick={() => onSelect(group.obraId)}
              className="text-left rounded-[20px] bg-card border shadow-sm shadow-black/[0.03] p-5 md:p-6 transition-transform active:scale-[0.97] group relative overflow-hidden"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[12px] mb-4"
                style={{ backgroundColor: accent.bg }}
              >
                <Building2 className="h-[18px] w-[18px]" style={{ color: accent.fg }} />
              </span>
              <p className="text-[15px] font-semibold truncate pr-6">{group.obraNome}</p>
              {group.obraEndereco && (
                <p className="flex items-center gap-1 text-[12px] text-muted-foreground mt-1 truncate pr-6">
                  <MapPin className="h-[11px] w-[11px] shrink-0 opacity-60" />
                  <span className="truncate">{group.obraEndereco}</span>
                </p>
              )}
              <p className="text-[24px] md:text-[28px] font-bold tabular-nums tracking-tight leading-none mt-3">
                {formatCurrency(group.totalCost)}
              </p>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
                <div>
                  <p className="text-[15px] font-semibold tabular-nums leading-none">
                    {group.totalItems}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">itens</p>
                </div>
                <div>
                  <p className="text-[15px] font-semibold tabular-nums leading-none">
                    {formatNumber(group.totalQty)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">unidades</p>
                </div>
                <div>
                  <p className="text-[15px] font-semibold tabular-nums leading-none">
                    {group.almoxarifados}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">almoxarifados</p>
                </div>
                {group.lowStockCount > 0 && (
                  <div className="ml-auto">
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning px-2 py-0.5 text-[11px] font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {group.lowStockCount}
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </>
  )
}

// ── EstoqueTableHeader ─────────────────────────────────────────────────────────
export function EstoqueTableHeader({
  selectedObra,
  selectedGroup,
  totals,
  onBack,
}: {
  selectedObra: string
  selectedGroup: ObraGroup | null | undefined
  totals: EstoqueTotals
  onBack: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para seleção de obras"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-primary hover:bg-primary/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <div>
          <h2 className="text-[17px] font-semibold">
            {selectedObra === '__all__' ? 'Estoque Geral' : (selectedGroup?.obraNome ?? '—')}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            {selectedObra === '__all__'
              ? `${formatNumber(totals.items)} itens · ${formatCurrency(totals.cost)}`
              : `${selectedGroup?.totalItems ?? 0} itens · ${formatCurrency(selectedGroup?.totalCost ?? 0)}`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── LowStockBanner ─────────────────────────────────────────────────────────────
export function LowStockBanner({ lowCount }: { lowCount: number }) {
  if (lowCount === 0) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
      <p className="text-[13px]">
        <span className="font-medium text-warning">
          {lowCount} {lowCount === 1 ? 'item' : 'itens'}
        </span>
        <span className="text-muted-foreground"> abaixo do estoque mínimo</span>
      </p>
    </div>
  )
}

// ── CategoryFilterChips ────────────────────────────────────────────────────────
export function CategoryFilterChips({
  categorias,
  filteredData,
  filterCategoria,
  onFilterChange,
}: {
  categorias: { key: string; label: string; count: number }[]
  filteredData: EstoqueItem[]
  filterCategoria: string
  onFilterChange: (cat: string) => void
}) {
  if (filteredData.length === 0 || categorias.length <= 1) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <button
        type="button"
        onClick={() => onFilterChange('ALL')}
        className={cn(
          'relative flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
          filterCategoria === 'ALL'
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
        )}
      >
        {filterCategoria === 'ALL' && (
          <motion.div
            layoutId="estoque-cat-pill"
            className="absolute inset-0 rounded-full bg-primary"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative z-10">Todas ({filteredData.length})</span>
      </button>
      {categorias.map((cat) => (
        <button
          key={cat.key}
          type="button"
          onClick={() => onFilterChange(cat.key)}
          className={cn(
            'relative flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
            filterCategoria === cat.key
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
          )}
        >
          {filterCategoria === cat.key && (
            <motion.div
              layoutId="estoque-cat-pill"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">
            {cat.label} ({cat.count})
          </span>
        </button>
      ))}
    </div>
  )
}

// ── MaterialNameCell ───────────────────────────────────────────────────────────
export function MaterialNameCell({
  item,
  onDetail,
}: {
  item: EstoqueItem
  onDetail: (item: EstoqueItem) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onDetail(item)
      }}
      className="text-left group/mat max-w-[280px]"
    >
      <span
        className="font-medium text-[13px] group-hover/mat:text-[#007AFF] transition-colors block line-clamp-2 break-words"
        title={item.material?.nome || '—'}
      >
        {item.material?.nome || '—'}
      </span>
      <div className="flex items-center gap-1">
        <p className="text-[11px] text-muted-foreground font-mono">{item.material?.codigo || ''}</p>
        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30 opacity-0 group-hover/mat:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}

// ── QuantityCell ───────────────────────────────────────────────────────────────
export function QuantityCell({ item }: { item: EstoqueItem }) {
  const qty = item.quantidade ?? 0
  const min = item.material?.estoque_minimo || 0
  const isLow = min > 0 && qty < min
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('font-semibold tabular-nums text-[13px]', isLow && 'text-destructive')}>
        {formatNumber(qty)}
      </span>
      {isLow && <AlertTriangle className="h-3 w-3 text-warning" />}
    </div>
  )
}
