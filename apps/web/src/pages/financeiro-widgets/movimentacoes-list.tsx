import { formatBRL, parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { StickyFooter } from '@/components/ui/sticky-footer'
import { useToast } from '@/components/ui/toast'
import { useFormDraft } from '@/hooks/use-form-draft'
import { usePermissions } from '@/hooks/use-permissions'
import {
  type ContaPagarParcela,
  type ContaReceberParcela,
  type FinanceiroConta,
  type FinanceiroMovimentacaoWithConta,
  type MaterialCostTrendPoint,
  type ObraRow,
  useAllFinanceiroMovimentacoes,
  useContasPagarParcelas,
  useContasReceberParcelas,
  useCreateContaPagar,
  useCreateContaReceber,
  useCreateFinanceiroConta,
  useCreateFinanceiroMovimentacao,
  useDashboardStats,
  useDeleteContaPagar,
  useDeleteContaReceber,
  useDeleteFinanceiroConta,
  useFinanceiroContas,
  useFinanceiroMeta,
  useMaterialCostTrend,
  useObras,
  usePagarParcela,
  useReceberParcela,
  type useUpsertFinanceiroMeta,
} from '@/hooks/use-supabase'
import { useUndoableDelete } from '@/hooks/use-undoable-delete'
import { exportMovimentacoesCsv } from '@/lib/export-csv'
import {
  type CreateContaPagarInput,
  type CreateContaReceberInput,
  type CreateFinanceiroContaInput,
  createContaPagarSchema,
  createContaReceberSchema,
  createFinanceiroContaSchema,
} from '@/lib/schemas'
import { accents, cn, formatCurrency, formatDate, formatDateShort } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Package,
  Plus,
  Receipt,
  Search,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, type UseFormReturn, useForm } from 'react-hook-form'

import { clr, modalCn, tipos } from '../financeiro'
import { contaItemVariants, contaListVariants, contaSubLabel } from '../financeiro'
import { MovimentacaoListItem } from './primitives'

export function FinanceiroMovimentacoesList({
  movsLoading,
  todasMovs,
  contas,
}: {
  movsLoading: boolean
  todasMovs: FinanceiroMovimentacaoWithConta[]
  contas: FinanceiroConta[]
}) {
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'>(
    'TODOS',
  )
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredMovs = useMemo(() => {
    return todasMovs.filter((m) => {
      if (tipoFilter !== 'TODOS' && m.tipo !== tipoFilter) return false
      if (dateFrom && (m.data ?? '') < dateFrom) return false
      if (dateTo && (m.data ?? '') > dateTo) return false
      if (search) {
        const q = search.toLowerCase()
        const motivo = (m.motivo ?? '').toLowerCase()
        const banco = (m.financeiro_contas?.banco ?? '').toLowerCase()
        if (!motivo.includes(q) && !banco.includes(q)) return false
      }
      return true
    })
  }, [todasMovs, search, tipoFilter, dateFrom, dateTo])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="px-4 md:px-6 mt-10"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Movimentações</h2>
        {!movsLoading && todasMovs.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-muted-foreground font-medium tabular-nums">
              {filteredMovs.length !== todasMovs.length
                ? `${filteredMovs.length} de ${todasMovs.length} registros`
                : `${todasMovs.length} ${todasMovs.length === 1 ? 'registro' : 'registros'}`}
            </span>
            {filteredMovs.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  exportMovimentacoesCsv(
                    filteredMovs.map((m) => ({
                      data: m.data,
                      motivo: m.motivo ?? '',
                      tipo: m.tipo,
                      valor: Number(m.valor),
                      banco: m.financeiro_contas?.banco ?? '',
                      subconta: m.subconta,
                    })),
                  )
                }
                className="flex items-center gap-1.5 h-8 rounded-lg px-3 text-[12px] font-medium text-muted-foreground border hover:text-foreground hover:bg-accent/50 transition-colors"
                title="Exportar CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Filter bar ─────────────────────────────────────── */}
      {!movsLoading && (
        <div className="mb-5 space-y-2">
          {/* Row 1: search + type */}
          <div className="flex flex-wrap gap-2">
            {/* Text search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descrição ou conta…"
                className="w-full h-9 rounded-xl border bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>

            {/* Type filter */}
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as typeof tipoFilter)}
              className="h-9 rounded-xl border bg-card px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer transition-all"
            >
              <option value="TODOS">Todos os tipos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SAIDA">Saídas</option>
              <option value="TRANSFERENCIA">Transferências</option>
            </select>
          </div>

          {/* Row 2: date range */}
          <div className="flex flex-wrap items-center gap-2">
            <Calendar
              className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0"
              aria-hidden="true"
            />
            <span className="text-[12px] font-medium text-muted-foreground select-none">
              Período:
            </span>

            {/* Date from */}
            <div className="flex items-center gap-1.5 h-9 rounded-xl border bg-card px-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
              <span className="text-[11px] font-semibold text-muted-foreground/70 select-none uppercase tracking-wide">
                De
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-full bg-transparent text-[13px] text-foreground outline-none cursor-pointer w-[130px]"
                aria-label="Data inicial"
              />
            </div>

            <span className="text-[12px] text-muted-foreground/50 select-none">—</span>

            {/* Date to */}
            <div className="flex items-center gap-1.5 h-9 rounded-xl border bg-card px-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
              <span className="text-[11px] font-semibold text-muted-foreground/70 select-none uppercase tracking-wide">
                Até
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-full bg-transparent text-[13px] text-foreground outline-none cursor-pointer w-[130px]"
                aria-label="Data final"
              />
            </div>

            {/* Active filter chips + clear */}
            {(search || tipoFilter !== 'TODOS' || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setTipoFilter('TODOS')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="ml-auto flex items-center gap-1.5 h-9 rounded-xl px-3 text-[12px] font-medium text-primary hover:bg-primary/8 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card border overflow-hidden">
        {movsLoading ? (
          /* Skeletons durante carregamento */
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4',
                i > 0 && 'border-t border-border/20',
              )}
            >
              <div className="h-10 w-10 rounded-xl bg-muted/50 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-[15px] w-36 rounded-md bg-muted/50 animate-pulse" />
                <div className="h-[12px] w-24 rounded-md bg-muted/40 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-shrink-0 text-right">
                <div className="h-[15px] w-20 rounded-md bg-muted/50 animate-pulse ml-auto" />
                <div className="h-[11px] w-14 rounded-md bg-muted/40 animate-pulse ml-auto" />
              </div>
            </div>
          ))
        ) : todasMovs.length === 0 ? (
          /* Estado vazio */
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#8E8E9314' }}
            >
              <Receipt className="h-7 w-7 text-muted-foreground/30" />
            </span>
            <p className="text-[17px] font-semibold">Sem movimentações</p>
            <p className="text-[14px] text-muted-foreground text-center max-w-[220px] leading-relaxed">
              As movimentações das suas contas aparecerão aqui
            </p>
          </div>
        ) : filteredMovs.length === 0 ? (
          /* Nenhum resultado para os filtros */
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#8E8E9314' }}
            >
              <Search className="h-7 w-7 text-muted-foreground/30" />
            </span>
            <p className="text-[17px] font-semibold">Nenhum resultado</p>
            <p className="text-[14px] text-muted-foreground text-center max-w-[220px] leading-relaxed">
              Tente ajustar os filtros de busca
            </p>
          </div>
        ) : (
          filteredMovs.map((mov: FinanceiroMovimentacaoWithConta, i: number) => (
            <MovimentacaoListItem key={mov.id} mov={mov} i={i} contas={contas} />
          ))
        )}
      </div>
    </motion.div>
  )
}
