/**
 * fornecedores-components.tsx
 * Componentes extraídos de fornecedores.tsx:
 * FornecedorCard, parseCategorias, getFilteredFornecedores, SupplierPriceRankingSection
 */
import type {
  FornecedorCategoriaMapRow,
  FornecedorRow,
  SupplierPriceRankingItem,
} from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Award, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getFornecedorAvatarColor, getFornecedorInitials } from './fornecedor-utils'

export const clr = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  gray: '#8E8E93',
} as const

export type FornecedorData = FornecedorRow

/* ═══════════════════════════════════════════════════════════
   FornecedorCard — Apple Contacts-inspired cell
   ═══════════════════════════════════════════════════════════ */
export function FornecedorCard({
  fornecedor,
  catNames,
  onNavigate,
}: {
  fornecedor: FornecedorData
  catNames: string[]
  onNavigate: () => void
}) {
  const color = getFornecedorAvatarColor(fornecedor.nome)
  const initials = getFornecedorInitials(fornecedor.nome)
  const subtitle = fornecedor.telefone || fornecedor.email || fornecedor.cnpj || null

  return (
    <motion.button
      whileTap={{ scale: 0.997 }}
      onClick={onNavigate}
      className={cn(
        'w-full flex items-center gap-3.5 pl-4 pr-3 py-[12px] text-left',
        'transition-colors duration-75',
        'active:bg-black/[0.04] dark:active:bg-white/[0.04]',
      )}
    >
      {/* Avatar + status dot */}
      <div className="relative flex-shrink-0">
        <div
          className="flex h-[44px] w-[44px] items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <span className="text-[16px] font-semibold text-white leading-none select-none">
            {initials}
          </span>
        </div>
        <span
          className="absolute -bottom-px -right-px h-[12px] w-[12px] rounded-full ring-[2px] ring-white dark:ring-[#1C1C1E]"
          style={{ backgroundColor: fornecedor.ativo !== false ? clr.green : clr.gray }}
        />
      </div>

      {/* Name + subtitle + category tags */}
      <div className="flex-1 min-w-0">
        <p className="text-[15.5px] font-semibold leading-snug line-clamp-2 tracking-[-0.15px]">
          {fornecedor.nome}
        </p>
        {subtitle && (
          <p className="text-[12.5px] text-muted-foreground/45 mt-[2px] truncate leading-snug">
            {subtitle}
          </p>
        )}
        {catNames.length > 0 && (
          <div className="flex items-center gap-1 mt-[4px]">
            {catNames.slice(0, 2).map((name) => (
              <span
                key={name}
                className="text-[10.5px] font-medium px-[6px] py-[1.5px] rounded-full"
                style={{ backgroundColor: `${clr.blue}10`, color: `${clr.blue}A0` }}
              >
                {name}
              </span>
            ))}
            {catNames.length > 2 && (
              <span className="text-[10.5px] text-muted-foreground/30 font-medium">
                +{catNames.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Disclosure indicator */}
      <ChevronRight
        className="h-[14px] w-[14px] text-muted-foreground/20 flex-shrink-0"
        strokeWidth={2.5}
      />
    </motion.button>
  )
}

/* ── Pure helper: parse categories from RPC flat rows ── */
export function parseCategorias(catMapRaw: FornecedorCategoriaMapRow[]) {
  const catInfo = new Map<string, { id: string; nome: string; count: number }>()
  const fornMap = new Map<string, Set<string>>()
  const nameMap = new Map<string, Set<string>>()

  for (const row of catMapRaw || []) {
    const fornId = row.fornecedor_id
    const catId = row.categoria_id
    const catNome = row.categoria_nome
    if (!catId || !fornId) continue

    if (!catInfo.has(catId)) catInfo.set(catId, { id: catId, nome: catNome, count: 0 })
    if (!fornMap.has(catId)) fornMap.set(catId, new Set())
    if (!nameMap.has(fornId)) nameMap.set(fornId, new Set())

    const fornSet = fornMap.get(catId)
    if (fornSet && !fornSet.has(fornId)) {
      fornSet.add(fornId)
      const catGroup = catInfo.get(catId)
      if (catGroup) catGroup.count++
    }
    nameMap.get(fornId)?.add(catNome)
  }

  return {
    categorias: Array.from(catInfo.values()).sort((a, b) => a.nome.localeCompare(b.nome)),
    catFornMap: fornMap,
    fornCatNames: nameMap,
  }
}

/* ── Pure helper: filter list ── */
export function getFilteredFornecedores(
  fornecedores: FornecedorData[],
  catFilter: string | null,
  catFornMap: Map<string, Set<string>>,
  search: string,
) {
  let list = [...fornecedores]
  if (catFilter !== null) {
    const allowedIds = catFornMap.get(catFilter)
    list = allowedIds ? list.filter((f) => allowedIds.has(f.id)) : []
  }
  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (f) =>
        f.nome.toLowerCase().includes(q) ||
        f.cnpj?.includes(q) ||
        f.telefone?.includes(q) ||
        f.email?.toLowerCase().includes(q),
    )
  }
  return list
}

/* ═══════════════════════════════════════════════════════════
   SupplierPriceRankingSection
   ═══════════════════════════════════════════════════════════ */
export function SupplierPriceRankingSection({ ranking }: { ranking: SupplierPriceRankingItem[] }) {
  const [expanded, setExpanded] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        fornecedorId: string
        fornecedorNome: string
        items: SupplierPriceRankingItem[]
        avgDiffPercent: number
        totalEntries: number
      }
    >()
    for (const item of ranking) {
      const existing = map.get(item.fornecedorId) || {
        fornecedorId: item.fornecedorId,
        fornecedorNome: item.fornecedorNome,
        items: [],
        avgDiffPercent: 0,
        totalEntries: 0,
      }
      existing.items.push(item)
      existing.totalEntries += item.entryCount
      map.set(item.fornecedorId, existing)
    }
    for (const group of map.values()) {
      const totalWeighted = group.items.reduce((s, i) => s + i.diffPercent * i.entryCount, 0)
      const totalCount = group.items.reduce((s, i) => s + i.entryCount, 0)
      group.avgDiffPercent = totalCount > 0 ? totalWeighted / totalCount : 0
    }
    return Array.from(map.values()).sort((a, b) => a.avgDiffPercent - b.avgDiffPercent)
  }, [ranking])

  if (grouped.length === 0) return null

  const displayed = expanded ? grouped : grouped.slice(0, 5)
  const bestSupplier = grouped[0]
  const worstSupplier = grouped[grouped.length - 1]

  return (
    <div className="px-4 md:px-8 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-[20px] bg-card border shadow-sm shadow-black/[0.03] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#5856D6]/10 flex-shrink-0">
              <Award className="h-[18px] w-[18px] text-[#5856D6]" />
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.2px]">Ranking de Preços</p>
              <p className="text-[12px] text-muted-foreground/45">
                Comparação vs. média de mercado
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {bestSupplier && bestSupplier.avgDiffPercent < 0 && (
              <span className="text-[11px] font-medium bg-[#34C759]/10 text-[#34C759] px-2.5 py-1 rounded-full flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Melhor: {bestSupplier.fornecedorNome}
              </span>
            )}
            {worstSupplier && worstSupplier.avgDiffPercent > 5 && (
              <span className="text-[11px] font-medium bg-[#FF3B30]/10 text-[#FF3B30] px-2.5 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Mais caro: {worstSupplier.fornecedorNome}
              </span>
            )}
          </div>
        </div>

        {/* Ranking list */}
        <div className="divide-y divide-border/8 dark:divide-white/[0.04]">
          {displayed.map((group, idx) => {
            const isPositive = group.avgDiffPercent > 0
            const isCheap = group.avgDiffPercent < -2
            const isExpensive = group.avgDiffPercent > 2
            const color = getFornecedorAvatarColor(group.fornecedorNome)
            const initials = getFornecedorInitials(group.fornecedorNome)

            return (
              <motion.div
                key={group.fornecedorId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-3 px-5 py-3"
              >
                <span className="text-[12px] font-bold tabular-nums text-muted-foreground/30 w-5 text-right flex-shrink-0">
                  {idx + 1}
                </span>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-[11px] font-semibold text-white leading-none select-none">
                    {initials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-snug">{group.fornecedorNome}</p>
                  <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                    {group.items.length} {group.items.length === 1 ? 'material' : 'materiais'} ·{' '}
                    {group.totalEntries} compras
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={cn(
                      'text-[13px] font-bold tabular-nums flex items-center gap-0.5 justify-end',
                      isCheap && 'text-[#34C759]',
                      isExpensive && 'text-[#FF3B30]',
                      !isCheap && !isExpensive && 'text-muted-foreground/60',
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : group.avgDiffPercent < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    {isPositive ? '+' : ''}
                    {group.avgDiffPercent.toFixed(1)}%
                  </span>
                  <p className="text-[10px] text-muted-foreground/30 mt-0.5">vs. mercado</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {grouped.length > 5 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full py-3 text-[13px] text-[#007AFF] font-medium border-t border-border/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
          >
            {expanded ? 'Ver menos' : `Ver todos (${grouped.length})`}
          </button>
        )}
      </motion.div>
    </div>
  )
}
