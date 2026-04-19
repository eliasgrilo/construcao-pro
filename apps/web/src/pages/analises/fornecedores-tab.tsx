import { EmptyState } from '@/components/ui/empty-state'
import { useSupplierPriceRanking } from '@/hooks/use-supabase'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart2, ChevronDown, RotateCcw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  GlassCard,
  LoadingGrid,
  MetricCard,
  SectionHeader,
  SparkBar,
  TrendBadge,
  containerVariants,
  rowVariants,
} from './analises-primitives'

export function FornecedoresTab({ isActive }: { isActive: boolean }) {
  const qc = useQueryClient()
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

  const above = useMemo(() => sorted.filter((r) => r.diffPercent > 0).length, [sorted])
  const below = useMemo(() => sorted.filter((r) => r.diffPercent <= 0).length, [sorted])
  const maxPrice = useMemo(() => Math.max(...(sorted.map((r) => r.avgPrice) ?? [1])), [sorted])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-[15px] font-semibold">Erro ao carregar ranking</h3>
          <p className="text-[13px] text-muted-foreground mt-1">
            Verifique sua conexão e tente novamente
          </p>
        </div>
        <button
          type="button"
          onClick={() => qc.invalidateQueries({ queryKey: ['fornecedores', 'price-ranking'] })}
          className="flex items-center gap-2 h-10 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white active:scale-[0.97] hover:bg-primary/90 transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 pb-6 space-y-5">
        <LoadingGrid cols={3} rows={1} cardHeight={88} />
        <LoadingGrid cols={1} rows={5} cardHeight={72} />
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

  return (
    <div className="flex flex-col gap-5 px-4 md:px-6 pb-8">
      {/* KPI grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-3"
      >
        <MetricCard
          label="Comparações"
          value={sorted.length}
          formatter="number"
          accent="#007AFF"
          delay={0}
        />
        <MetricCard
          label="Acima da média"
          value={above}
          formatter="number"
          accent="#FF3B30"
          description={sorted.length > 0 ? `${Math.round((above / sorted.length) * 100)}% do total` : undefined}
          delay={0.05}
        />
        <MetricCard
          label="Abaixo da média"
          value={below}
          formatter="number"
          accent="#34C759"
          description={sorted.length > 0 ? `${Math.round((below / sorted.length) * 100)}% do total` : undefined}
          delay={0.1}
        />
      </motion.div>

      {/* Search + Sort */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <GlassCard className="p-3 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar fornecedor ou material..."
              className="w-full pl-9 pr-4 h-10 rounded-xl bg-muted/40 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none h-10 pl-3 pr-8 rounded-xl bg-muted/40 text-[13px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="diffPercent">Ordenar: Diferença %</option>
              <option value="avgPrice">Ordenar: Preço médio</option>
              <option value="entryCount">Ordenar: Nº compras</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          </div>
        </GlassCard>
      </motion.div>

      {/* Ranking list */}
      <div>
        <SectionHeader
          title="Ranking de Fornecedores"
          description={`${sorted.length} comparação${sorted.length !== 1 ? 'ões' : ''}`}
          className="mb-3"
        />
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2"
        >
          {sorted.map((item, idx) => {
            const isAbove = item.diffPercent > 0
            const diffColor = isAbove ? '#FF3B30' : item.diffPercent < -5 ? '#34C759' : '#8E8E93'
            const barPct = maxPrice > 0 ? (item.avgPrice / maxPrice) * 100 : 0

            return (
              <motion.div key={`${item.fornecedorId}-${item.materialId}`} variants={rowVariants}>
                <GlassCard className="p-4">
                  {/* Mobile */}
                  <div className="flex flex-col gap-3 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[14px] truncate">{item.fornecedorNome}</p>
                        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                          {item.materialNome}
                          {item.categoriaNome ? ` · ${item.categoriaNome}` : ''}
                        </p>
                      </div>
                      <TrendBadge
                        value={item.diffPercent}
                        invertColors
                        className="flex-shrink-0"
                      />
                    </div>
                    <SparkBar
                      value={barPct}
                      color={diffColor}
                      max={100}
                      delay={0.1 + idx * 0.025}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Preço médio</p>
                        <p className="text-[12px] font-semibold tabular-nums">
                          {formatCurrency(item.avgPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Média mercado</p>
                        <p className="text-[12px] tabular-nums text-muted-foreground">
                          {formatCurrency(item.marketAvg)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Compras</p>
                        <p className="text-[12px] tabular-nums">{item.entryCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-bold tabular-nums"
                      style={{ backgroundColor: `${diffColor}18`, color: diffColor }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-[14px] truncate">{item.fornecedorNome}</p>
                        {item.categoriaNome && (
                          <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg shrink-0">
                            {item.categoriaNome}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground truncate">{item.materialNome}</p>
                      <SparkBar
                        value={barPct}
                        color={diffColor}
                        max={100}
                        delay={0.1 + idx * 0.02}
                        className="mt-1.5 w-full"
                      />
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                      {[
                        { label: 'Preço médio', val: formatCurrency(item.avgPrice), color: undefined },
                        { label: 'Média mercado', val: formatCurrency(item.marketAvg), color: undefined },
                        { label: 'Compras', val: String(item.entryCount), color: undefined },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="text-right min-w-[72px]">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                          <p
                            className={cn('text-[13px] font-semibold tabular-nums')}
                            style={color ? { color } : undefined}
                          >
                            {val}
                          </p>
                        </div>
                      ))}
                      <TrendBadge value={item.diffPercent} invertColors />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
