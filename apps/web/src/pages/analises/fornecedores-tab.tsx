import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupplierPriceRanking } from '@/hooks/use-supabase'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { containerVariants, rowVariants } from './analises-shared'

// ─── Tab: Orçamento por Obra ─────────────────────────────────────────────────

export function FornecedoresTab({ isActive }: { isActive: boolean }) {
  const { data: ranking, isLoading, error } = useSupplierPriceRanking({ enabled: isActive })
  const [sortBy, setSortBy] = useState<'diffPercent' | 'avgPrice' | 'entryCount'>('diffPercent')
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    if (!ranking) return []
    const filtered = search.trim()
      ? ranking.filter(
          (r) =>
            r.fornecedorNome.toLowerCase().includes(search.toLowerCase()) ||
            r.materialNome.toLowerCase().includes(search.toLowerCase()),
        )
      : ranking
    return [...filtered].sort((a, b) => {
      if (sortBy === 'diffPercent') return b.diffPercent - a.diffPercent
      if (sortBy === 'avgPrice') return b.avgPrice - a.avgPrice
      return b.entryCount - a.entryCount
    })
  }, [ranking, sortBy, search])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">Erro ao carregar ranking</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!ranking || ranking.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <EmptyState
          icon={BarChart2}
          title="Sem dados de preço"
          description="Registre entradas de materiais com fornecedor e preço para ver o ranking"
        />
      </div>
    )
  }

  const above = sorted.filter((r) => r.diffPercent > 0).length
  const below = sorted.filter((r) => r.diffPercent <= 0).length

  return (
    <div className="flex flex-col gap-5 px-4 md:px-6 pb-6">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="rounded-2xl bg-card p-4 border border-border/8">
          <p className="text-xs text-muted-foreground">Total comparações</p>
          <p className="text-xl font-bold tabular-nums mt-1">{sorted.length}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 border border-border/8">
          <p className="text-xs text-muted-foreground">Acima da média</p>
          <p className="text-xl font-bold tabular-nums mt-1" style={{ color: '#FF3B30' }}>
            {above}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-4 border border-border/8">
          <p className="text-xs text-muted-foreground">Abaixo da média</p>
          <p className="text-xl font-bold tabular-nums mt-1" style={{ color: '#34C759' }}>
            {below}
          </p>
        </div>
      </motion.div>

      {/* Search + Sort */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar fornecedor ou material..."
            className="w-full pl-9 pr-4 h-10 rounded-xl bg-muted/60 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="appearance-none h-10 pl-3 pr-8 rounded-xl bg-muted/60 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="diffPercent">Ordenar: Diferença %</option>
            <option value="avgPrice">Ordenar: Preço médio</option>
            <option value="entryCount">Ordenar: Nº compras</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl bg-card border border-border/8 overflow-hidden"
      >
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 gap-3 p-4 border-b border-border/8 bg-muted/30">
          {[
            'Fornecedor',
            'Material / Categoria',
            'Preço Médio',
            'Média Mercado',
            'Diferença',
            'Compras',
          ].map((h, i) => (
            <div
              key={h}
              className={cn(
                'col-span-2',
                i === 0 && 'col-span-3',
                i === 1 && 'col-span-3',
                i >= 2 && 'text-right',
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">
                {h}
              </p>
            </div>
          ))}
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {sorted.map((item, idx) => {
            const isAbove = item.diffPercent > 0
            const diffColor = isAbove ? '#FF3B30' : item.diffPercent < -5 ? '#34C759' : '#8E8E93'
            return (
              <motion.div key={`${item.fornecedorId}-${item.materialId}`} variants={rowVariants}>
                {/* Desktop row */}
                <div
                  className={cn(
                    'hidden md:grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-border/8 items-center hover:bg-accent/40 transition-colors',
                    idx % 2 === 0 && 'bg-muted/5',
                  )}
                >
                  <div className="col-span-3 min-w-0">
                    <p className="font-medium text-sm truncate">{item.fornecedorNome}</p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm truncate">{item.materialNome}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.categoriaNome}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-semibold text-sm tabular-nums">
                      {formatCurrency(item.avgPrice)}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(item.marketAvg)}
                    </p>
                  </div>
                  <div className="col-span-1 text-right">
                    <div
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ backgroundColor: `${diffColor}18` }}
                    >
                      {isAbove ? (
                        <TrendingUp
                          className="h-3 w-3 flex-shrink-0"
                          style={{ color: diffColor }}
                        />
                      ) : (
                        <TrendingDown
                          className="h-3 w-3 flex-shrink-0"
                          style={{ color: diffColor }}
                        />
                      )}
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{ color: diffColor }}
                      >
                        {isAbove ? '+' : ''}
                        {formatNumber(item.diffPercent)}%
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-sm tabular-nums text-muted-foreground">{item.entryCount}</p>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden p-4 border-b border-border/8 hover:bg-accent/40 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.fornecedorNome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.materialNome} · {item.categoriaNome}
                      </p>
                    </div>
                    <div
                      className="ml-3 flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${diffColor}18` }}
                    >
                      {isAbove ? (
                        <TrendingUp className="h-3 w-3" style={{ color: diffColor }} />
                      ) : (
                        <TrendingDown className="h-3 w-3" style={{ color: diffColor }} />
                      )}
                      <span className="text-xs font-bold tabular-nums" style={{ color: diffColor }}>
                        {isAbove ? '+' : ''}
                        {formatNumber(item.diffPercent)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Preço médio</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(item.avgPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Média mercado</p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(item.marketAvg)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Compras</p>
                      <p className="text-sm tabular-nums">{item.entryCount}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ─── Tab: Tendência de Custos ────────────────────────────────────────────────
