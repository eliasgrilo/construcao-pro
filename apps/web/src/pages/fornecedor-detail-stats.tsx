/**
 * fornecedor-detail-stats.tsx
 * Stats + top materiais sections extracted from fornecedor-detail.tsx
 */
import { formatCurrency, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Package, ShoppingBag, TrendingUp } from 'lucide-react'
import { clr } from './fornecedor-utils'

interface StatsData {
  totalGasto: number
  numCompras: number
  numMateriais: number
  lastDate: string | null
  ticketMedio: number
}

interface TopMaterial {
  id: string
  nome: string
  codigo?: string | null
  total: number
  count: number
}

export function FornecedorDetailStatsSection({
  isLoadingMovs,
  stats,
  topMateriais,
  color,
}: {
  isLoadingMovs: boolean
  stats: StatsData
  topMateriais: TopMaterial[]
  color: string
}) {
  return (
    <>
      {/* ════════════════════════════════════════════════════
          Stats — total gasto prominent + 3-col grid
          ═══════════════════���════════════════════════════════ */}
      <div className="px-4 md:px-8 mt-4">
        {isLoadingMovs ? (
          <div className="animate-pulse space-y-2.5">
            <div className="h-[80px] rounded-2xl bg-muted/10" />
            <div className="grid grid-cols-3 gap-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[62px] rounded-2xl bg-muted/10" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Total investido — full width, prominent */}
            <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/10 dark:border-white/[0.06] px-5 py-4 mb-2.5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp
                  className="h-[14px] w-[14px] flex-shrink-0"
                  style={{ color: `${clr.blue}80` }}
                  strokeWidth={2}
                />
                <p className="text-[11px] text-muted-foreground/45 font-semibold uppercase tracking-wide">
                  Total Investido
                </p>
              </div>
              <p
                className="text-[28px] font-bold tabular-nums tracking-tight"
                style={{ color: clr.blue }}
              >
                {formatCurrency(stats.totalGasto)}
              </p>
              {stats.numCompras > 0 && (
                <p className="text-[12px] text-muted-foreground/35 mt-0.5">
                  em {stats.numCompras} {stats.numCompras === 1 ? 'compra' : 'compras'}
                  {stats.lastDate ? ` · última em ${formatDate(stats.lastDate)}` : ''}
                </p>
              )}
            </div>

            {/* 3-col: Compras · Materiais · Ticket Médio */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/10 dark:border-white/[0.06] px-3.5 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShoppingBag
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: `${clr.green}80` }}
                    strokeWidth={2}
                  />
                  <p className="text-[10px] text-muted-foreground/40 font-semibold uppercase tracking-wide">
                    Compras
                  </p>
                </div>
                <p className="text-[18px] font-bold tabular-nums" style={{ color: clr.green }}>
                  {stats.numCompras}
                </p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/10 dark:border-white/[0.06] px-3.5 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Package
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: `${clr.purple}80` }}
                    strokeWidth={2}
                  />
                  <p className="text-[10px] text-muted-foreground/40 font-semibold uppercase tracking-wide">
                    Materiais
                  </p>
                </div>
                <p className="text-[18px] font-bold tabular-nums" style={{ color: clr.purple }}>
                  {stats.numMateriais}
                </p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/10 dark:border-white/[0.06] px-3.5 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: `${clr.orange}80` }}
                    strokeWidth={2}
                  />
                  <p className="text-[10px] text-muted-foreground/40 font-semibold uppercase tracking-wide">
                    Ticket
                  </p>
                </div>
                <p
                  className="text-[12px] font-bold leading-tight tabular-nums"
                  style={{ color: clr.orange }}
                >
                  {stats.ticketMedio > 0 ? formatCurrency(stats.ticketMedio) : '—'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═════════════════════════════════════════��══════════
          Principais Materiais — top 5 by spend
          ══════════════════��═════════════════════════════════ */}
      {!isLoadingMovs && topMateriais.length > 0 && (
        <div className="px-4 md:px-8 mt-4">
          <p className="text-[12px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-2 px-1">
            Principais Materiais
          </p>
          <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/10 dark:border-white/[0.06] overflow-hidden divide-y divide-border/8 dark:divide-white/[0.04]">
            {topMateriais.map((mat, idx) => {
              const pct = topMateriais[0].total > 0 ? (mat.total / topMateriais[0].total) * 100 : 0
              return (
                <div key={mat.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[11.5px] font-bold tabular-nums text-muted-foreground/20 w-4 text-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-[5px]">
                      <p className="text-[14px] font-semibold truncate leading-tight">{mat.nome}</p>
                      <span
                        className="text-[13px] font-semibold tabular-nums flex-shrink-0"
                        style={{ color: clr.blue }}
                      >
                        {formatCurrency(mat.total)}
                      </span>
                    </div>
                    {/* Relative spend bar */}
                    <div className="h-[3px] rounded-full bg-muted/10 overflow-hidden mb-[4px]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.06 }}
                      />
                    </div>
                    <p className="text-[11.5px] text-muted-foreground/35">
                      {mat.count} {mat.count === 1 ? 'compra' : 'compras'}
                      {mat.codigo && (
                        <span className="font-mono ml-1.5 opacity-60">{mat.codigo}</span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
