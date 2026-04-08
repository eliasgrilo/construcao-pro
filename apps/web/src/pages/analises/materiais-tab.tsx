import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDashboardCustoPorObra,
  useMateriais,
  useMaterialCostTrend,
  useMaterialEntradas,
  useSupplierPriceRanking,
} from '@/hooks/use-supabase'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  Package,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  ATIVA: { label: 'Ativa', color: '#34C759', bgColor: '#34C75918' },
  FINALIZADA: { label: 'Finalizada', color: '#8E8E93', bgColor: '#8E8E9318' },
  PAUSADA: { label: 'Pausada', color: '#FF9500', bgColor: '#FF950018' },
  VENDIDO: { label: 'Vendido', color: '#5856D6', bgColor: '#5856D618' },
  TERRENO: { label: 'Terreno', color: '#AF52DE', bgColor: '#AF52DE18' },
  MANUTENCAO: { label: 'Manutenção', color: '#FF9500', bgColor: '#FF950018' },
}

function ringColor(pct: number) {
  return pct > 90 ? '#FF3B30' : pct > 70 ? '#FF9500' : '#34C759'
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
} as const

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 },
  },
} as const

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface ChartTipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function ChartTip({ active, payload, label }: ChartTipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur-md">
        <p className="text-[12px] font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-[14px] font-bold tabular-nums">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

// ─── Tab: Orçamento por Obra ─────────────────────────────────────────────────

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
    const prices = entradas
      .filter((e) => e.preco_unitario != null)
      .map((e) => e.preco_unitario as number)
    if (prices.length === 0) return null
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((s, p) => s + p, 0) / prices.length,
      count: prices.length,
    }
  }, [entradas])

  const priceTrend = useMemo(() => {
    if (!entradas || entradas.length < 2) return []
    return [...entradas]
      .filter((e) => e.preco_unitario != null)
      .reverse()
      .slice(0, 12)
      .map((e) => ({
        name: formatDate(e.created_at),
        price: e.preco_unitario as number,
      }))
  }, [entradas])

  return (
    <div className="flex flex-col gap-5 px-4 md:px-6 pb-6">
      {/* Material selector */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-card p-5 border border-border/8"
      >
        <p className="text-sm font-semibold mb-3">Selecionar material</p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar material..."
            className="w-full pl-9 pr-4 h-10 rounded-xl bg-muted/60 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {loadingMat ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filtered.slice(0, 50).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 h-8 rounded-xl text-[13px] font-medium transition-all active:scale-[0.96]',
                  m.id === selectedId
                    ? 'bg-primary text-white shadow-sm'
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
      </motion.div>

      {!selectedId && (
        <div className="flex items-center justify-center p-8">
          <EmptyState
            icon={Package}
            title="Selecione um material"
            description="Escolha um material acima para ver o histórico de preços e compras"
          />
        </div>
      )}

      {selectedId && (
        <>
          {/* Price stats */}
          {loadingEntradas ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : priceStats ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <div className="rounded-2xl bg-card p-4 border border-border/8">
                <p className="text-xs text-muted-foreground">Preço médio</p>
                <p className="text-lg font-bold tabular-nums mt-1">
                  {formatCurrency(priceStats.avg)}
                </p>
              </div>
              <div className="rounded-2xl bg-card p-4 border border-border/8">
                <p className="text-xs text-muted-foreground">Menor preço</p>
                <p className="text-lg font-bold tabular-nums mt-1" style={{ color: '#34C759' }}>
                  {formatCurrency(priceStats.min)}
                </p>
              </div>
              <div className="rounded-2xl bg-card p-4 border border-border/8">
                <p className="text-xs text-muted-foreground">Maior preço</p>
                <p className="text-lg font-bold tabular-nums mt-1" style={{ color: '#FF3B30' }}>
                  {formatCurrency(priceStats.max)}
                </p>
              </div>
              <div className="rounded-2xl bg-card p-4 border border-border/8">
                <p className="text-xs text-muted-foreground">Nº compras</p>
                <p className="text-lg font-bold tabular-nums mt-1">{priceStats.count}</p>
              </div>
            </motion.div>
          ) : null}

          {/* Price trend mini chart */}
          {priceTrend.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="rounded-2xl bg-card p-5 border border-border/8"
            >
              <p className="text-sm font-semibold mb-4">
                Evolução do preço unitário — {selectedMaterial?.nome}
              </p>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={priceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
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
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur-md">
                          <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                          <p className="text-[14px] font-bold tabular-nums">
                            {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#007AFF"
                    strokeWidth={2}
                    dot={{ fill: '#007AFF', r: 3.5 }}
                    activeDot={{ r: 5.5, fill: '#007AFF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* History table */}
          {loadingEntradas ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : entradas && entradas.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-2xl bg-card border border-border/8 overflow-hidden"
            >
              <div className="hidden md:grid grid-cols-12 gap-3 p-4 border-b border-border/8 bg-muted/30">
                {['Data', 'Fornecedor', 'Obra', 'Qtd', 'Preço Unit.', 'Total'].map((h, i) => (
                  <div
                    key={h}
                    className={cn('col-span-2', i === 0 && 'col-span-2', i >= 3 && 'text-right')}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">
                      {h}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                {entradas.map((e, idx) => {
                  const total = (e.quantidade || 0) * (e.preco_unitario || 0)
                  return (
                    <div
                      key={e.id}
                      className={cn(
                        'hidden md:grid grid-cols-12 gap-3 px-4 py-3 border-b border-border/8 items-center text-sm hover:bg-accent/40 transition-colors',
                        idx % 2 === 0 && 'bg-muted/5',
                      )}
                    >
                      <div className="col-span-2 text-muted-foreground text-xs">
                        {formatDate(e.created_at)}
                      </div>
                      <div className="col-span-2 truncate">{e.fornecedor?.nome || '—'}</div>
                      <div className="col-span-2 truncate text-muted-foreground text-xs">
                        {e.almoxarifado?.obra?.nome || '—'}
                      </div>
                      <div className="col-span-2 text-right tabular-nums">
                        {formatNumber(e.quantidade)} {e.unidade || ''}
                      </div>
                      <div className="col-span-2 text-right tabular-nums">
                        {e.preco_unitario ? formatCurrency(e.preco_unitario) : '—'}
                      </div>
                      <div className="col-span-2 text-right tabular-nums font-medium">
                        {total > 0 ? formatCurrency(total) : '—'}
                      </div>
                    </div>
                  )
                })}
                {/* Mobile cards */}
                {entradas.map((e) => {
                  const total = (e.quantidade || 0) * (e.preco_unitario || 0)
                  return (
                    <div key={`m-${e.id}`} className="md:hidden p-4 border-b border-border/8">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">
                            {e.fornecedor?.nome || 'Sem fornecedor'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {e.almoxarifado?.obra?.nome || '—'} · {formatDate(e.created_at)}
                          </p>
                        </div>
                        {total > 0 && (
                          <p className="font-semibold text-sm tabular-nums ml-3">
                            {formatCurrency(total)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Quantidade</p>
                          <p className="text-sm tabular-nums">
                            {formatNumber(e.quantidade)} {e.unidade || ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Preço unit.</p>
                          <p className="text-sm tabular-nums">
                            {e.preco_unitario ? formatCurrency(e.preco_unitario) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <EmptyState
                icon={Package}
                title="Sem histórico"
                description="Nenhuma entrada registrada para este material"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
