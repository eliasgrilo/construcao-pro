import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { type MaterialEntradaRow, useMaterialEntradas } from '@/hooks/use-supabase'
import { cn, formatCurrency, formatDateShort, formatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import { AlertTriangle, Calendar, Clock, TrendingDown, TrendingUp, X } from 'lucide-react'
import * as React from 'react'
import { iosTallDialogCn } from './dialog-styles'
import type { EstoqueItem } from './estoque-types'

function PriceSparkline({ entries }: { entries: MaterialEntradaRow[] }) {
  if (entries.length < 2) return null
  const prices = [...entries]
    .reverse()
    .map((e) => e.preco_unitario ?? 0)
    .filter((p) => p > 0)
  if (prices.length < 2) return null

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const w = 200
  const h = 48
  const pad = 4

  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (w - pad * 2)
    const y = h - pad - ((p - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })

  const lastPrice = prices[prices.length - 1]
  const firstPrice = prices[0]
  const isUp = lastPrice > firstPrice
  const color = isUp ? '#FF3B30' : '#34C759'

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-12"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />
        <polygon
          fill="url(#sparkGrad)"
          points={`${pad},${h - pad} ${points.join(' ')} ${pad + ((prices.length - 1) / (prices.length - 1)) * (w - pad * 2)},${h - pad}`}
        />
      </svg>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground/40">{entries.length} entradas</span>
        <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color }}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? '+' : ''}
          {(((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

export function EstoqueItemDetail({
  item,
  onClose,
}: {
  item: EstoqueItem | null
  onClose: () => void
}) {
  const materialId = item?.material?.id ?? null
  const { data: entradas = [], isLoading } = useMaterialEntradas(materialId)

  const cachedItem = React.useRef<EstoqueItem | null>(null)
  if (item) cachedItem.current = item
  const activeItem = item || cachedItem.current

  if (!activeItem) return null

  const qty = activeItem.quantidade ?? 0
  const unit = activeItem.material?.unidade ?? activeItem.material?.categoria?.unidade ?? 'UN'
  const precoAtual = activeItem.material?.preco_unitario ?? 0
  const min = activeItem.material?.estoque_minimo || 0
  const isLow = min > 0 && qty < min

  // Price stats from entry history
  const priceEntries = entradas.filter((e) => e.preco_unitario && e.preco_unitario > 0)
  const avgPrice =
    priceEntries.length > 0
      ? priceEntries.reduce((s, e) => s + (e.preco_unitario ?? 0), 0) / priceEntries.length
      : precoAtual
  const minPrice =
    priceEntries.length > 0
      ? Math.min(...priceEntries.map((e) => e.preco_unitario ?? 0))
      : precoAtual
  const maxPrice =
    priceEntries.length > 0
      ? Math.max(...priceEntries.map((e) => e.preco_unitario ?? 0))
      : precoAtual

  const modalCn = iosTallDialogCn

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={modalCn}>
        <DialogTitle className="sr-only">Detalhe do Material</DialogTitle>
        <DialogDescription className="sr-only">
          Histórico de entradas e variação de preço
        </DialogDescription>

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-[18px] font-bold truncate tracking-[-0.2px]">
                {activeItem.material?.nome}
              </p>
              <p className="text-[12px] text-muted-foreground/50 font-mono mt-0.5">
                {activeItem.material?.codigo || '—'} · {activeItem.material?.categoria?.nome || '—'}
              </p>
            </div>
            <motion.button
              type="button"
              onClick={onClose}
              whileTap={{ scale: 0.86 }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-muted-foreground flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 space-y-5">
          {/* ─── Quantity Card ─── */}
          <div className="rounded-[16px] bg-white dark:bg-white/[0.06] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                Estoque Atual
              </span>
              {isLow && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#FF9500] bg-[#FF9500]/10 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-3 w-3" />
                  Baixo
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[36px] font-bold tabular-nums tracking-tight leading-none">
                {formatNumber(qty)}
              </span>
              <span className="text-[14px] text-muted-foreground/50 font-medium">{unit}</span>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-border/10">
              <div>
                <p className="text-[11px] text-muted-foreground/40 uppercase tracking-wider">
                  Valor Un.
                </p>
                <p className="text-[15px] font-semibold tabular-nums mt-0.5">
                  {formatCurrency(precoAtual)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground/40 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-[15px] font-semibold tabular-nums mt-0.5">
                  {formatCurrency(qty * precoAtual)}
                </p>
              </div>
              {min > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground/40 uppercase tracking-wider">
                    Mínimo
                  </p>
                  <p className="text-[15px] font-semibold tabular-nums mt-0.5">
                    {formatNumber(min)} {unit}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Price Variation Sparkline ─── */}
          {priceEntries.length >= 2 && (
            <div className="rounded-[16px] bg-white dark:bg-white/[0.06] p-4 space-y-3">
              <span className="text-[12px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                Variação de Preço
              </span>
              <PriceSparkline entries={entradas} />
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/10">
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                    Menor
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums text-[#34C759] mt-0.5">
                    {formatCurrency(minPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                    Média
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums mt-0.5">
                    {formatCurrency(avgPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                    Maior
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums text-[#FF3B30] mt-0.5">
                    {formatCurrency(maxPrice)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Entry History Timeline ─── */}
          <div className="space-y-3">
            <span className="text-[12px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-1">
              Histórico de Entradas
            </span>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={String(i)}
                    className="rounded-[14px] bg-white dark:bg-white/[0.06] p-4 animate-pulse"
                  >
                    <div className="h-3 w-2/3 bg-muted/20 rounded-full" />
                    <div className="h-2.5 w-1/2 bg-muted/12 rounded-full mt-2" />
                  </div>
                ))}
              </div>
            ) : entradas.length === 0 ? (
              <div className="rounded-[14px] bg-white dark:bg-white/[0.06] p-5 text-center">
                <Clock className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground/40">Nenhuma entrada registrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entradas.map((entry, idx) => {
                  const preco = entry.preco_unitario ?? 0
                  const prevPreco =
                    idx < entradas.length - 1 ? (entradas[idx + 1].preco_unitario ?? 0) : null
                  const priceDiff =
                    prevPreco !== null && prevPreco > 0
                      ? ((preco - prevPreco) / prevPreco) * 100
                      : null

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      className="rounded-[14px] bg-white dark:bg-white/[0.06] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold tabular-nums">
                              +{formatNumber(entry.quantidade)} {entry.unidade || unit}
                            </span>
                            {priceDiff !== null && Math.abs(priceDiff) > 0.5 && (
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                                  priceDiff > 0
                                    ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                                    : 'bg-[#34C759]/10 text-[#34C759]',
                                )}
                              >
                                {priceDiff > 0 ? (
                                  <TrendingUp className="h-2.5 w-2.5" />
                                ) : (
                                  <TrendingDown className="h-2.5 w-2.5" />
                                )}
                                {priceDiff > 0 ? '+' : ''}
                                {priceDiff.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[12px] text-muted-foreground/50 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateShort(entry.created_at)}
                            </span>
                            {entry.fornecedor?.nome && (
                              <span className="text-[11px] text-[#007AFF]/70 bg-[#007AFF]/[0.06] px-1.5 py-0.5 rounded-full font-medium">
                                {entry.fornecedor.nome}
                              </span>
                            )}
                            {entry.almoxarifado?.obra?.nome && (
                              <span className="text-[11px] text-muted-foreground/35 font-medium">
                                {entry.almoxarifado.obra.nome}
                              </span>
                            )}
                          </div>
                          {entry.observacao && (
                            <p className="text-[11px] text-muted-foreground/35 mt-1.5 leading-snug italic">
                              {entry.observacao}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[14px] font-bold tabular-nums">
                            {formatCurrency(preco)}
                          </p>
                          <p className="text-[10px] text-muted-foreground/35 mt-0.5">
                            {formatCurrency(preco * entry.quantidade)} total
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
