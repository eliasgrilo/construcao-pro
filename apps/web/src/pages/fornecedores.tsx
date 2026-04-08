import { EmptyState } from '@/components/ui/empty-state'
import { QueryError } from '@/components/ui/query-error'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useFornecedorCategoriaMap,
  useFornecedores,
  useSupplierPriceRanking,
} from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CreateFornecedorModal } from './fornecedor-create-modal'
import {
  FornecedorCard,
  type FornecedorData,
  SupplierPriceRankingSection,
  clr,
  getFilteredFornecedores,
  parseCategorias,
} from './fornecedores-components'

export function FornecedoresPage() {
  const navigate = useNavigate()
  const { canManageFornecedores } = usePermissions()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // '/' focuses search input; Escape clears it
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable)
        return
      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const { data: fornecedores = [], isLoading, isError, refetch } = useFornecedores()
  const { data: catMapRaw = [] } = useFornecedorCategoriaMap()
  const { data: priceRanking = [] } = useSupplierPriceRanking()

  const { categorias, catFornMap, fornCatNames } = useMemo(
    () => parseCategorias(catMapRaw),
    [catMapRaw],
  )

  const stats = useMemo(() => {
    const ativos = fornecedores.filter((f) => f.ativo !== false).length
    return { total: fornecedores.length, ativos, inativos: fornecedores.length - ativos }
  }, [fornecedores])

  const filtered = useMemo(
    () => getFilteredFornecedores(fornecedores, catFilter, catFornMap, search),
    [fornecedores, catFilter, catFornMap, search],
  )

  const sections = useMemo(() => {
    if (filtered.length === 0) return []
    const map = new Map<string, FornecedorData[]>()
    for (const f of filtered) {
      const key = (f.nome?.[0] || '#').toUpperCase()
      if (!map.has(key)) map.set(key, [])
      const grp = map.get(key)
      if (grp) grp.push(f)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const renderCard = (f: FornecedorData) => (
    <FornecedorCard
      key={f.id}
      fornecedor={f}
      catNames={Array.from(fornCatNames.get(f.id) ?? [])}
      onNavigate={() =>
        navigate({ to: '/fornecedores/$fornecedorId', params: { fornecedorId: f.id } })
      }
    />
  )

  const hasFilters = !!search || catFilter !== null

  if (isError) {
    return (
      <div className="px-4 md:px-8 pt-10">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight mb-6">Fornecedores</h1>
        <QueryError onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="pb-20 min-h-screen">
      {/* ── Header ── */}
      <div className="px-4 md:px-8 pt-10 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Fornecedores</h1>
            {!isLoading && stats.total > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px] text-muted-foreground/50 font-medium">
                  {stats.total} {stats.total === 1 ? 'cadastrado' : 'cadastrados'}
                </span>
                {stats.ativos > 0 && (
                  <>
                    <span className="text-muted-foreground/20 text-[10px]">·</span>
                    <span className="text-[12px] font-semibold" style={{ color: `${clr.green}C0` }}>
                      {stats.ativos} {stats.ativos === 1 ? 'ativo' : 'ativos'}
                    </span>
                  </>
                )}
                {stats.inativos > 0 && (
                  <>
                    <span className="text-muted-foreground/20 text-[10px]">·</span>
                    <span className="text-[12px] font-medium text-muted-foreground/35">
                      {stats.inativos} inativo{stats.inativos > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setCreateOpen(true)}
            disabled={!canManageFornecedores}
            className={cn(
              'flex items-center gap-1.5 rounded-full pl-3 pr-4 py-[9px]',
              'text-[13px] font-semibold text-white',
              'shadow-sm shadow-[#007AFF]/25 hover:shadow-md hover:shadow-[#007AFF]/30',
              'transition-shadow mt-1 flex-shrink-0 disabled:opacity-60',
            )}
            style={{ backgroundColor: clr.blue }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Novo
          </motion.button>
        </div>
      </div>

      {/* ── Search + Category Filters ── */}
      <div className="px-4 md:px-8 space-y-3 mb-5">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground/35"
            strokeWidth={2}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
                searchInputRef.current?.blur()
              }
            }}
            placeholder="Buscar"
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
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-muted-foreground/20"
              >
                <X className="h-[10px] w-[10px]" strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {categorias.length > 0 && (
          <div className="relative -mx-4 md:-mx-8">
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
                Todos
                <span
                  className={cn(
                    'text-[11px] tabular-nums font-semibold',
                    catFilter === null ? 'text-white/60' : 'text-muted-foreground/30',
                  )}
                >
                  {fornecedores.length}
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
      </div>

      {/* ── Supplier Price Ranking ── */}
      {priceRanking.length > 0 && <SupplierPriceRankingSection ranking={priceRanking} />}

      {/* ── List ── */}
      <div className="px-4 md:px-8">
        {isLoading ? (
          <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden divide-y divide-border/8 dark:divide-white/[0.04]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={String(i)}
                className="flex items-center gap-3.5 px-4 py-[12px] animate-pulse"
              >
                <div className="h-[44px] w-[44px] rounded-full bg-muted/20 flex-shrink-0" />
                <div className="flex-1 space-y-[7px]">
                  <div className="h-[13px] w-2/5 rounded-full bg-muted/20" />
                  <div className="h-[11px] w-1/3 rounded-full bg-muted/12" />
                  <div className="h-[10px] w-2/5 rounded-full bg-muted/8" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          hasFilters ? (
            <div className="flex flex-col items-center py-20 gap-2">
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] bg-[#007AFF]/[0.06]">
                <Building2 className="h-7 w-7 text-[#007AFF]/30" strokeWidth={1.5} />
              </div>
              <p className="text-[16px] font-semibold text-muted-foreground/50 mt-2">
                Nenhum resultado
              </p>
              <p className="text-[13px] text-muted-foreground/35 text-center max-w-[240px] leading-relaxed">
                {search ? `Sem resultados para "${search}"` : 'Nenhum fornecedor nesta categoria'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setCatFilter(null)
                }}
                className="mt-3 text-[14px] text-[#007AFF] font-semibold"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="Nenhum fornecedor"
              description="Adicione fornecedores para associá-los a notas fiscais e materiais"
              action={
                canManageFornecedores
                  ? { label: '+ Novo fornecedor', onClick: () => setCreateOpen(true) }
                  : undefined
              }
            />
          )
        ) : sections.length > 1 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {sections.map(([letter, items]) => (
              <div key={letter}>
                <p className="text-[12px] font-bold text-muted-foreground/40 mb-1.5 px-1 uppercase tracking-wide">
                  {letter}
                </p>
                <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden divide-y divide-border/8 dark:divide-white/[0.04]">
                  {items.map(renderCard)}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden divide-y divide-border/8 dark:divide-white/[0.04]"
          >
            {filtered.map(renderCard)}
          </motion.div>
        )}

        {filtered.length > 0 && (
          <p className="text-[12px] text-muted-foreground/30 text-center mt-3 pb-1">
            {filtered.length} {filtered.length === 1 ? 'fornecedor' : 'fornecedores'}
            {hasFilters ? ' (filtrado)' : ''}
          </p>
        )}
      </div>

      <CreateFornecedorModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
