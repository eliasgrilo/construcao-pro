import type { MovimentacaoRow as MovRow } from '@/hooks/use-supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Package, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { clr, formatMonthLabel, getMonthKey } from './fornecedor-utils'

export type TipoMov = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'

export const tipoConfig: Record<
  TipoMov,
  { label: string; icon: typeof ArrowLeftRight; tint: string }
> = {
  ENTRADA: { label: 'Entrada', icon: ArrowDownRight, tint: clr.green },
  SAIDA: { label: 'Saída', icon: ArrowUpRight, tint: clr.red },
  TRANSFERENCIA: { label: 'Transferência', icon: ArrowLeftRight, tint: clr.blue },
}

export function MovimentacaoRow({ mov }: { mov: MovRow }) {
  const tipo = (mov.tipo as TipoMov) || 'ENTRADA'
  const cfg = tipoConfig[tipo] ?? tipoConfig.ENTRADA
  const Icon = cfg.icon
  const total = (mov.quantidade ?? 0) * (mov.preco_unitario ?? 0)
  const materialNome = mov.material?.nome ?? '—'
  const materialCodigo = mov.material?.codigo
  const categoriaNome = mov.material?.categoria?.nome as string | undefined
  const obraNome = mov.almoxarifado?.obra?.nome

  return (
    <div className="flex items-start gap-3.5 px-4 py-3.5">
      <div
        className="mt-[2px] flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${cfg.tint}12` }}
      >
        <Icon className="h-[15px] w-[15px]" style={{ color: cfg.tint }} strokeWidth={2.2} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[14.5px] font-semibold leading-snug truncate tracking-[-0.15px]">
            {materialNome}
          </p>
          <span
            className="text-[14.5px] font-semibold tabular-nums tracking-[-0.3px] flex-shrink-0"
            style={{ color: total > 0 ? cfg.tint : `${cfg.tint}70` }}
          >
            {total > 0 ? formatCurrency(total) : '—'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-[3px] flex-wrap">
          {categoriaNome && (
            <span
              className="text-[10.5px] font-semibold px-[7px] py-[1.5px] rounded-full flex-shrink-0"
              style={{ backgroundColor: `${clr.blue}0E`, color: `${clr.blue}B8` }}
            >
              {categoriaNome}
            </span>
          )}
          {materialCodigo && (
            <span className="text-[10.5px] font-mono text-muted-foreground/35 bg-muted/25 rounded px-1 py-[1px] flex-shrink-0">
              {materialCodigo}
            </span>
          )}
          {obraNome && (
            <span className="text-[11.5px] font-medium text-muted-foreground/50 truncate">
              {obraNome}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface HistoricoProps {
  movimentacoes: MovRow[]
  isLoadingMovs: boolean
}

export function HistoricoFornecedor({ movimentacoes, isLoadingMovs }: HistoricoProps) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)

  const categorias = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; count: number }>()
    for (const m of movimentacoes) {
      const cat = m.material?.categoria
      if (cat?.id) {
        const existing = map.get(cat.id)
        if (existing) {
          existing.count++
        } else {
          map.set(cat.id, { id: cat.id, nome: cat.nome, count: 1 })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [movimentacoes])

  const filtered = useMemo(() => {
    let list: MovRow[] = [...movimentacoes]
    if (catFilter !== null) {
      list = list.filter((m: MovRow) => m.material?.categoria?.id === catFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((m: MovRow) =>
        [m.material?.nome, m.material?.codigo, m.almoxarifado?.nome, m.almoxarifado?.obra?.nome]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    }
    return list
  }, [movimentacoes, catFilter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, { items: MovRow[]; total: number }>()
    for (const m of filtered) {
      const key = getMonthKey(m.created_at)
      if (!map.has(key)) map.set(key, { items: [], total: 0 })
      const group = map.get(key)
      if (!group) continue
      group.items.push(m)
      group.total += (m.quantidade ?? 0) * (m.preco_unitario ?? 0)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ key, ...data }))
  }, [filtered])

  return (
    <div className="px-4 md:px-8 mt-6">
      <h2 className="text-[20px] font-bold tracking-tight mb-4">Lançamentos</h2>

      <div className="relative mb-3">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground/35"
          strokeWidth={2}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar material, obra..."
          className={cn(
            'w-full rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06]',
            'pl-10 pr-10 py-[9px] text-[16px]',
            'border-0 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20',
            'placeholder:text-muted-foreground/30 transition-all',
          )}
        />
        <AnimatePresence>
          {search && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.1 }}
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-muted-foreground/20"
            >
              <X className="h-[10px] w-[10px]" strokeWidth={3} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {categorias.length > 0 && (
        <div className="relative -mx-4 md:-mx-8 mb-4">
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
          <div className="flex items-center gap-[6px] overflow-x-auto scrollbar-hide px-4 md:px-8 py-0.5">
            <button
              type="button"
              onClick={() => setCatFilter(null)}
              className={cn(
                'flex-shrink-0 flex items-center gap-[5px] rounded-full px-3 py-[6px] text-[13px] font-medium transition-all whitespace-nowrap',
                catFilter === null
                  ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/20'
                  : 'bg-black/[0.04] dark:bg-white/[0.07] text-muted-foreground/65 hover:bg-black/[0.06] dark:hover:bg-white/[0.1]',
              )}
            >
              Todas
              <span
                className={cn(
                  'text-[11px] tabular-nums font-semibold',
                  catFilter === null ? 'text-white/60' : 'text-muted-foreground/30',
                )}
              >
                {movimentacoes.length}
              </span>
            </button>
            {categorias.map((cat) => {
              const isActive = catFilter === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatFilter(isActive ? null : cat.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-[5px] rounded-full px-3 py-[6px] text-[13px] font-medium transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/20'
                      : 'bg-black/[0.04] dark:bg-white/[0.07] text-muted-foreground/65 hover:bg-black/[0.06] dark:hover:bg-white/[0.1]',
                  )}
                >
                  {cat.nome}
                  <span
                    className={cn(
                      'text-[11px] tabular-nums font-semibold',
                      isActive ? 'text-white/60' : 'text-muted-foreground/30',
                    )}
                  >
                    {cat.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isLoadingMovs ? (
        <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden divide-y divide-border/8 dark:divide-white/[0.04]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={String(i)}
              className="rounded-2xl border bg-card p-4 animate-pulse flex items-center gap-4"
            >
              <div className="h-[36px] w-[36px] rounded-full bg-muted/20 flex-shrink-0 mt-[2px]" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between gap-2">
                  <div className="h-[14px] w-2/5 rounded-full bg-muted/20" />
                  <div className="h-[14px] w-16 rounded-full bg-muted/20" />
                </div>
                <div className="h-[11px] w-3/5 rounded-full bg-muted/12" />
                <div className="h-[10px] w-2/5 rounded-full bg-muted/8" />
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2">
          <div className="flex h-[56px] w-[56px] items-center justify-center rounded-[18px] bg-muted/[0.06]">
            <Package className="h-6 w-6 text-muted-foreground/20" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-semibold text-muted-foreground/50 mt-1">
            {search || catFilter !== null ? 'Nenhum resultado' : 'Sem lançamentos'}
          </p>
          <p className="text-[13px] text-muted-foreground/35 text-center max-w-[240px] leading-relaxed">
            {search
              ? `Sem resultados para "${search}"`
              : catFilter !== null
                ? 'Nenhuma movimentação nesta categoria'
                : 'Este fornecedor ainda não tem movimentações registradas'}
          </p>
          {(search || catFilter !== null) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setCatFilter(null)
              }}
              className="mt-2 text-[13px] font-semibold"
              style={{ color: clr.blue }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.key}>
              <div className="flex items-baseline justify-between mb-2 px-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-[12px] font-bold text-muted-foreground/45 uppercase tracking-widest">
                    {formatMonthLabel(group.key)}
                  </p>
                  <span className="text-[11px] text-muted-foreground/25 normal-case tracking-normal font-normal">
                    {group.items.length} {group.items.length === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                </div>
                {group.total > 0 && (
                  <span
                    className="text-[12px] font-semibold tabular-nums"
                    style={{ color: `${clr.blue}90` }}
                  >
                    {formatCurrency(group.total)}
                  </span>
                )}
              </div>
              <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden divide-y divide-border/8 dark:divide-white/[0.04]">
                {group.items.map((mov: MovRow) => (
                  <MovimentacaoRow key={mov.id} mov={mov} />
                ))}
              </div>
            </div>
          ))}
          <p className="text-[12px] text-muted-foreground/30 text-center mt-2 pb-1">
            {filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
            {catFilter !== null || search ? ' (filtrado)' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
