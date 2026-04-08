import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, CloudUpload, Receipt, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useRef } from 'react'
import type { FilterId, NFRow } from './notas-fiscais-types'
import { FILTERS, STATUS_CONFIG, formatCNPJ, nfCardVariants } from './notas-fiscais-utils'

// ─── Page-level UI components ──────────────────────────────────────────────────

export function SummaryCard({
  total,
  count,
  vinculadas,
  processadas,
  pendentes,
  rejeitadas,
}: {
  total: number
  count: number
  vinculadas: number
  processadas: number
  pendentes: number
  rejeitadas: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative rounded-[28px] border bg-card overflow-hidden px-6 py-6 md:px-8 md:py-7"
      style={{ borderColor: 'rgba(0,0,0,0.07)' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 88% 12%, rgba(0,122,255,0.09) 0%, transparent 50%), radial-gradient(ellipse at 15% 85%, rgba(52,199,89,0.04) 0%, transparent 40%)',
        }}
      />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          Total em NF-e
        </p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-[38px] md:text-[46px] font-bold tabular-nums tracking-tight leading-none"
          style={{ color: '#007AFF' }}
        >
          {formatCurrency(total)}
        </motion.p>
        <p className="text-[13px] text-muted-foreground mt-2">
          {count} nota{count !== 1 ? 's' : ''} fiscal{count !== 1 ? 'is' : ''} importada
          {count !== 1 ? 's' : ''}
        </p>
        <div
          className="mt-5 pt-5 border-t grid grid-cols-4 gap-4"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        >
          {[
            { label: 'Vinculadas', value: vinculadas, color: '#34C759' },
            { label: 'Processadas', value: processadas, color: '#007AFF' },
            { label: 'Pendentes', value: pendentes, color: '#FF9500' },
            { label: 'Rejeitadas', value: rejeitadas, color: '#FF3B30' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: 0.15 + i * 0.05,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <p
                className="text-[26px] font-bold tabular-nums tracking-tight leading-none"
                style={{ color: stat.value > 0 ? stat.color : '#8E8E93' }}
              >
                {stat.value}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-1.5 leading-tight">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      className="flex items-center gap-2.5 rounded-[14px] px-3.5"
      style={{ backgroundColor: 'rgba(0,0,0,0.055)', height: 44 }}
    >
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por número ou CNPJ…"
        className="flex-1 bg-transparent text-[15px] placeholder:text-muted-foreground/60 focus:outline-none"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
            style={{ backgroundColor: '#8E8E9350' }}
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FilterPills({
  active,
  onChange,
  counts,
}: { active: FilterId; onChange: (id: FilterId) => void; counts: Record<string, number> }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {FILTERS.map((f) => {
        const isActive = f.id === active
        const count = counts[f.id] ?? 0
        if (f.id !== 'all' && count === 0) return null
        return (
          <motion.button
            key={f.id}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(f.id)}
            className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors"
            style={
              isActive
                ? { backgroundColor: f.color, color: 'white' }
                : { backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--muted-foreground)' }
            }
          >
            {f.label}
            <span
              className="text-[11px] font-bold tabular-nums rounded-full px-1.5"
              style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.10)' }}
            >
              {count}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

export function NFCard({
  nf,
  onOpen,
  onDelete,
}: { nf: NFRow; onOpen: () => void; onDelete: () => void }) {
  const cfg = STATUS_CONFIG[nf.status]
  const itemCount = nf._count?.itens ?? 0
  return (
    <motion.button
      type="button"
      variants={nfCardVariants}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="group relative flex w-full text-left items-center gap-4 rounded-[20px] border bg-card px-4 py-4 cursor-pointer transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/40"
      style={{ borderColor: 'rgba(0,0,0,0.07)', minHeight: 72 }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
        style={{ backgroundColor: '#007AFF0F' }}
      >
        <Receipt className="h-5 w-5" style={{ color: '#007AFF' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-[15px] font-bold tabular-nums tracking-tight">
            NF-e {nf.numero.padStart(6, '0')}
          </p>
          <span className="text-[11px] text-muted-foreground">Série {nf.serie}</span>
        </div>
        {nf.nome_emitente ? (
          <>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5 leading-snug">
              {nf.nome_emitente}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/50 tracking-tight">
              {formatCNPJ(nf.cnpj_emitente)}
            </p>
          </>
        ) : (
          <p className="font-mono text-[11px] text-muted-foreground/70 mt-0.5 tracking-tight">
            {formatCNPJ(nf.cnpj_emitente)}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
            style={{ backgroundColor: '#8E8E9312', color: '#8E8E93' }}
          >
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-[11px] text-muted-foreground/70">
            {formatDate(nf.data_emissao)}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1.5 pr-6">
        <p className="text-[15px] font-bold tabular-nums tracking-tight">
          {formatCurrency(nf.valor_total)}
        </p>
        {cfg && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: cfg.bg, color: cfg.text }}
          >
            <span
              className="h-[5px] w-[5px] rounded-full shrink-0"
              style={{ backgroundColor: cfg.dot }}
            />
            {cfg.label}
          </span>
        )}
      </div>
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30]/40"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        aria-label={`Remover NF-e ${nf.numero}`}
        title={`Remover NF-e nº ${nf.numero}`}
      >
        <Trash2 className="h-3.5 w-3.5" style={{ color: '#FF3B30' }} />
      </button>
      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-hover:opacity-0 transition-opacity" />
    </motion.button>
  )
}

export function MonthHeader({ label, total }: { label: string; total: number }) {
  return (
    <div
      className="flex items-center justify-between px-1 mb-3 mt-1 pb-2 border-b"
      style={{ borderColor: 'rgba(0,0,0,0.05)' }}
    >
      <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: '#8E8E93' }}>
        {label}
      </p>
      <p className="text-[12px] font-bold tabular-nums" style={{ color: '#8E8E93' }}>
        {formatCurrency(total)}
      </p>
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4, 5].map((n, i) => (
        <div
          key={n}
          className="flex items-center gap-4 rounded-[20px] border bg-card px-4 py-4"
          style={{ borderColor: 'rgba(0,0,0,0.07)', minHeight: 72, opacity: 1 - i * 0.14 }}
        >
          <div className="h-11 w-11 rounded-[14px] bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-44 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <div className="h-4 w-20 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-20 px-8 text-center"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative mb-6"
      >
        <div
          className="flex h-24 w-24 items-center justify-center rounded-[28px]"
          style={{
            backgroundColor: '#007AFF0F',
            boxShadow: '0 0 0 8px rgba(0,122,255,0.04), 0 0 0 16px rgba(0,122,255,0.02)',
          }}
        >
          <Receipt className="h-12 w-12" style={{ color: '#007AFF', opacity: 0.9 }} />
        </div>
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-background"
          style={{ backgroundColor: '#34C759' }}
        >
          <Sparkles className="h-4 w-4 text-white" />
        </motion.div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="text-[20px] font-bold tracking-tight"
      >
        Nenhuma nota fiscal
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-[14px] text-muted-foreground mt-2 max-w-xs leading-relaxed"
      >
        Importe seu primeiro XML de NF-e. A IA vinculará automaticamente os itens ao seu catálogo de
        materiais.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.38 }}
        className="mt-7"
      >
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: '0 12px 32px rgba(0,122,255,0.32)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onImport}
          className="flex items-center gap-2.5 rounded-[16px] px-6 py-3.5 text-[14px] font-semibold text-white transition-shadow"
          style={{ backgroundColor: '#007AFF', boxShadow: '0 8px 24px rgba(0,122,255,0.25)' }}
        >
          <CloudUpload className="h-4 w-4" />
          Importar XML de NF-e
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export function EmptySearch({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-[20px] mb-4"
        style={{ backgroundColor: '#8E8E930F' }}
      >
        <Search className="h-8 w-8" style={{ color: '#8E8E93', opacity: 0.7 }} />
      </div>
      <p className="text-[16px] font-bold text-foreground/70">Nenhum resultado</p>
      <p className="text-[13px] text-muted-foreground mt-1.5 max-w-xs">
        Tente outros termos ou remova os filtros aplicados.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 text-[13px] font-semibold transition-opacity hover:opacity-70"
        style={{ color: '#007AFF' }}
      >
        Limpar filtros
      </button>
    </motion.div>
  )
}
