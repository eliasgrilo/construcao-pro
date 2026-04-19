import { EmptyState } from '@/components/ui/empty-state'
import { useMateriais, useMaterialEntradas } from '@/hooks/use-supabase'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Package, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AreaGradient,
  ChartTip,
  GlassCard,
  LoadingGrid,
  MetricCard,
  SectionHeader,
  containerVariants,
  itemVariants,
} from './analises-primitives'

// ─── Tab: Materiais ───────────────────────────────────────────────────────────

export function MateriaisTab({ isActive }: { isActive: boolean }) {
  const { data: materiais, isLoading: loadingMat } = useMateriais({ enabled: isActive })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: entradas, isLoading: loadingEntradas } = useMaterialEntradas(selectedId)

  const filtered = useMemo(() => {
    if (!materiais) return []
    if (!search.trim()) return materiais
    return materiais.filter((m) => m.nome.toLowerCase().includes(search.toLowerCase()))
  }, [materiais, search])

  const selectedMaterial = materiais?.find((m) => m.id === selectedId)

  const priceStats = useMemo(() => {
    if (!entradas || entradas.length === 0) return null
    const withPrice = entradas.filter((e) => e.preco_unitario != null)
    if (withPrice.length === 0) return null

    const prices = withPrice.map((e) => e.preco_unitario as number)

    // Sort chronologically for delta calculation
    const sorted = [...withPrice].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    const lastTwo = sorted.slice(-2)
    let deltaPct: number | undefined
    if (lastTwo.length === 2) {
      const prev = lastTwo[0].preco_unitario as number
      const last = lastTwo[1].preco_unitario as number
      if (prev > 0) deltaPct = ((last - prev) / prev) * 100
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((s, p) => s + p, 0) / prices.length,
      count: prices.length,
      deltaPct,
      lastPrice: sorted.length > 0 ? (sorted[sorted.length - 1].preco_unitario as number) : null,
    }
  }, [entradas])

  const priceTrend = useMemo(() => {
    if (!entradas || entradas.length < 2) return []
    return [...entradas]
      .filter((e) => e.preco_unitario != null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-12)
      .map((e) => ({
        name: formatDate(e.created_at),
        price: e.preco_unitario as number,
      }))
  }, [entradas])

  return (
    <div className="flex flex-col gap-5 px-4 md:px-6 pb-8">
      {/* ── Material selector ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <GlassCard className="p-5">
          <SectionHeader
            title="Selecionar material"
            description="Escolha um material para explorar seu histórico de preços e compras"
            className="mb-4"
          />

          {/* Search input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar material..."
              className="w-full pl-9 pr-4 h-10 rounded-xl bg-muted/60 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
            />
          </div>

          {/* Material chips */}
          {loadingMat ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-8 w-24 rounded-xl bg-muted/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {filtered.slice(0, 60).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 h-8 rounded-xl text-[13px] font-medium transition-all active:scale-[0.96]',
                    m.id === selectedId
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'bg-muted/60 text-foreground hover:bg-muted',
                  )}
                >
                  <Package className="h-3.5 w-3.5 flex-shrink-0" />
                  {m.nome}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">Nenhum material encontrado</p>
              )}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* ── Conditional content ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!selectedId ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center py-16"
          >
            <EmptyState
              icon={Package}
              title="Selecione um material"
              description="Escolha um material acima para ver o histórico de preços e compras"
            />
          </motion.div>
        ) : (
          <motion.div
            key={`selected-${selectedId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            {/* ── Price stats ─────────────────────────────────────────────── */}
            {loadingEntradas ? (
              <LoadingGrid cols={4} rows={1} cardHeight={88} />
            ) : priceStats ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                <MetricCard
                  label="Último preço"
                  value={priceStats.lastPrice ?? priceStats.avg}
                  delta={priceStats.deltaPct}
                  deltaInverted
                  formatter="currency"
                  accent="#007AFF"
                />
                <MetricCard
                  label="Preço médio"
                  value={priceStats.avg}
                  formatter="currency"
                  accent="#5856D6"
                />
                <MetricCard
                  label="Menor preço"
                  value={priceStats.min}
                  formatter="currency"
                  accent="#34C759"
                />
                <MetricCard
                  label="Maior preço"
                  value={priceStats.max}
                  formatter="currency"
                  accent="#FF3B30"
                />
              </motion.div>
            ) : null}

            {/* ── Price trend chart ──────────────────────────────────────── */}
            {priceTrend.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 }}
              >
                <GlassCard className="p-5">
                  <SectionHeader
                    title={`Evolução do preço — ${selectedMaterial?.nome}`}
                    description="Últimas 12 entradas com preço registrado"
                    className="mb-5"
                  />
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart
                      data={priceTrend}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    >
                      <AreaGradient id="matPrice" color="#007AFF" />
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(142,142,147,0.1)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => formatCurrency(v)}
                        tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                        width={72}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#007AFF"
                        strokeWidth={2.5}
                        fill="url(#matPrice)"
                        dot={{ fill: '#007AFF', r: 3.5, strokeWidth: 0 }}
                        activeDot={{ r: 5.5, fill: '#007AFF', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>
              </motion.div>
            )}

            {/* ── History table ──────────────────────────────────────────── */}
            {loadingEntradas ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : entradas && entradas.length > 0 ? (
              <GlassCard className="overflow-hidden">
                {/* Desktop header */}
                <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-border/8 bg-muted/20">
                  {['Data', 'Fornecedor', 'Obra', 'Qtd', 'Preço Unit.', 'Total'].map((h, i) => (
                    <div
                      key={h}
                      className={cn(
                        'col-span-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60',
                        i >= 3 && 'text-right',
                      )}
                    >
                      {h}
                    </div>
                  ))}
                </div>

                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  {entradas.map((e, idx) => {
                    const total = (e.quantidade || 0) * (e.preco_unitario || 0)
                    return (
                      <motion.div
                        key={e.id}
                        variants={itemVariants}
                        className={cn(
                          'hidden md:grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-border/8 items-center hover:bg-accent/40 transition-colors',
                          idx % 2 === 0 && 'bg-muted/5',
                        )}
                      >
                        <div className="col-span-2 text-muted-foreground text-xs tabular-nums">
                          {formatDate(e.created_at)}
                        </div>
                        <div className="col-span-2 truncate font-medium text-[13px]">
                          {e.fornecedor?.nome || '—'}
                        </div>
                        <div className="col-span-2 truncate text-muted-foreground text-xs">
                          {e.almoxarifado?.obra?.nome || '—'}
                        </div>
                        <div className="col-span-2 text-right tabular-nums text-muted-foreground text-[13px]">
                          {formatNumber(e.quantidade)}
                          {e.unidade ? ` ${e.unidade}` : ''}
                        </div>
                        <div className="col-span-2 text-right tabular-nums font-medium text-[13px]">
                          {e.preco_unitario ? formatCurrency(e.preco_unitario) : '—'}
                        </div>
                        <div className="col-span-2 text-right tabular-nums font-semibold text-[13px]">
                          {total > 0 ? formatCurrency(total) : '—'}
                        </div>
                      </motion.div>
                    )
                  })}

                  {/* Mobile cards */}
                  {entradas.map((e) => {
                    const total = (e.quantidade || 0) * (e.preco_unitario || 0)
                    return (
                      <motion.div
                        key={`m-${e.id}`}
                        variants={itemVariants}
                        className="md:hidden p-4 border-b border-border/8 last:border-0"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {e.fornecedor?.nome || 'Sem fornecedor'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.almoxarifado?.obra?.nome || '—'} · {formatDate(e.created_at)}
                            </p>
                          </div>
                          {total > 0 && (
                            <p className="font-semibold text-sm tabular-nums ml-3 flex-shrink-0">
                              {formatCurrency(total)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[11px] text-muted-foreground">Qtd</p>
                            <p className="text-[13px] tabular-nums">
                              {formatNumber(e.quantidade)} {e.unidade || ''}
                            </p>
                          </div>
                          {e.preco_unitario && (
                            <div>
                              <p className="text-[11px] text-muted-foreground">Preço unit.</p>
                              <p className="text-[13px] tabular-nums">
                                {formatCurrency(e.preco_unitario)}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </GlassCard>
            ) : (
              <div className="flex items-center justify-center py-12">
                <EmptyState
                  icon={Package}
                  title="Sem histórico"
                  description="Nenhuma entrada registrada para este material"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
