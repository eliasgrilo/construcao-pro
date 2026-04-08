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
  useUpsertFinanceiroMeta,
} from '@/hooks/use-supabase'
import { useUndoableDelete } from '@/hooks/use-undoable-delete'
import { exportMovimentacoesCsv } from '@/lib/export-csv'
import {
  buildInstallmentSchedule,
  getRelativeDueLabel,
  groupItemsByMonth,
} from '@/lib/installments'
import {
  type CreateContaPagarInput,
  type CreateContaReceberInput,
  type CreateFinanceiroContaInput,
  createContaPagarSchema,
  createContaReceberSchema,
  createFinanceiroContaSchema,
} from '@/lib/schemas'
import { accents, cn, formatCurrency, formatDate, todayISO } from '@/lib/utils'
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
import { MovimentacaoListItem, ringColor } from '../financeiro-widgets'
import { NovaContaPagarModal } from './nova-conta-pagar-modal'
import { PagarParcelaModal } from './pagar-parcela-modal'
export function ContasAPagarSection({
  contas,
  obras,
}: {
  contas: FinanceiroConta[]
  obras: ObraRow[]
}) {
  const { toast } = useToast()
  const { data: parcelas = [], isLoading } = useContasPagarParcelas()
  const deleteMutation = useDeleteContaPagar()
  const pagarMutation = usePagarParcela()

  const [novaModalOpen, setNovaModalOpen] = useState(false)
  const [pagarModal, setPagarModal] = useState<ContaPagarParcela | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pagasExpanded, setPagasExpanded] = useState(false)

  /* ── Compute groups ── */
  const hojeStr = todayISO()

  const atrasadas = parcelas.filter(
    (p) => p.status === 'ATRASADO' || (p.status === 'PENDENTE' && p.vencimento < hojeStr),
  )
  const venceHoje = parcelas.filter((p) => p.status === 'PENDENTE' && p.vencimento === hojeStr)
  const proximas = parcelas.filter((p) => p.status === 'PENDENTE' && p.vencimento > hojeStr)
  const pagas = parcelas.filter((p) => p.status === 'PAGO')

  const totalAtrasado = atrasadas.reduce((s, p) => s + Number(p.valor), 0)
  const totalPago = pagas.reduce((s, p) => s + Number(p.valor), 0)
  const noPending = atrasadas.length === 0 && venceHoje.length === 0 && proximas.length === 0

  /* Group proximas by month */
  const proximasGrouped = groupItemsByMonth(proximas)
  const proximasMeses = Object.keys(proximasGrouped).sort()

  const handleOpenPagar = (p: ContaPagarParcela) => {
    if (contas.length === 0) {
      toast({
        title: 'Sem contas bancárias',
        description: 'Cadastre uma conta bancária antes de registrar pagamentos.',
        variant: 'error',
      })
      return
    }
    setPagarModal(p)
  }

  const handlePagarParcela = async (
    contaBancariaId: string,
    dataPagamento: string,
    valor: number,
  ) => {
    if (!pagarModal) return
    const desc = pagarModal.contas_pagar?.descricao ?? 'Conta a pagar'
    try {
      await pagarMutation.mutateAsync({
        parcelaId: pagarModal.id,
        contaBancariaId,
        valor,
        dataPagamento,
        descricao: desc,
        numeroParcela: pagarModal.numero_parcela,
        totalParcelas: pagarModal.total_parcelas,
      })
      setPagarModal(null)
      toast({ title: 'Pagamento registrado', variant: 'success' })
    } catch (err) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  const confirmDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: 'Conta a pagar excluída', variant: 'success' })
        setDeleteId(null)
      },
      onError: () => {
        toast({ title: 'Erro ao excluir conta a pagar', variant: 'error' })
        setDeleteId(null)
      },
    })
  }

  const renderParcelaRow = (
    p: ContaPagarParcela,
    opts: { urgency: 'atrasado' | 'hoje' | 'normal'; border?: boolean },
  ) => {
    const desc = p.contas_pagar?.descricao ?? '—'
    const categoria = p.contas_pagar?.categoria ?? 'Outros'
    const hasNF = !!p.contas_pagar?.nf_id
    const isMulti = p.total_parcelas > 1
    const parsedDate = new Date(`${p.vencimento}T12:00:00`)
    const urgColor =
      opts.urgency === 'atrasado' ? clr.red : opts.urgency === 'hoje' ? clr.orange : clr.blue

    return (
      <div
        key={p.id}
        className={cn(
          'flex items-center gap-3 px-4 md:px-5 py-3.5 group',
          opts.border !== false && 'border-t border-border/[0.07] dark:border-white/[0.04]',
        )}
      >
        {/* Calendar day badge */}
        <div
          className="flex h-[40px] w-[40px] flex-col items-center justify-center rounded-[10px] flex-shrink-0"
          style={{ backgroundColor: `${urgColor}10` }}
        >
          <span
            className="text-[9px] font-bold uppercase leading-none tracking-wide"
            style={{ color: `${urgColor}80` }}
          >
            {parsedDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
          </span>
          <span
            className="text-[18px] font-bold leading-tight tabular-nums"
            style={{ color: urgColor }}
          >
            {parsedDate.getDate()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-medium truncate leading-snug">{desc}</p>
          <div className="flex items-center gap-1.5 mt-[3px] flex-wrap">
            <span
              className="text-[11px] font-medium px-[6px] py-[1px] rounded-full"
              style={{ backgroundColor: `${urgColor}10`, color: urgColor }}
            >
              {categoria}
            </span>
            {hasNF && (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold px-[5px] py-[1px] rounded-full"
                style={{ backgroundColor: `${clr.blue}10`, color: clr.blue }}
              >
                <FileText className="h-[9px] w-[9px]" />
                NF
              </span>
            )}
            {isMulti && (
              <span className="text-[11px] text-muted-foreground/40">
                {p.numero_parcela}/{p.total_parcelas}
              </span>
            )}
          </div>
        </div>

        {/* Right: valor + countdown + actions */}
        <div className="flex flex-col items-end gap-[5px] flex-shrink-0">
          <span
            className="text-[14px] font-bold tabular-nums tracking-tight"
            style={{ color: urgColor }}
          >
            {formatCurrency(Number(p.valor))}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10.5px] font-semibold px-[7px] py-[2px] rounded-full"
              style={{ backgroundColor: `${urgColor}15`, color: urgColor }}
            >
              {getRelativeDueLabel(p.vencimento, hojeStr)}
            </span>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => handleOpenPagar(p)}
              className="flex h-[26px] items-center justify-center px-3 rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: urgColor }}
            >
              Pagar
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setDeleteId(p.conta_pagar_id)}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: '#FF3B3012' }}
            >
              <Trash2 className="h-3 w-3" style={{ color: clr.red }} />
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.42 }}
      className="px-4 md:px-6 mt-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">A Pagar</h2>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setNovaModalOpen(true)}
          className="flex items-center gap-1.5 text-[15px] font-medium hover:opacity-80 transition-opacity min-h-[44px] px-1"
          style={{ color: clr.red }}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </motion.button>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5',
                i > 0 && 'border-t border-border/10',
              )}
            >
              <div className="h-10 w-10 rounded-[10px] bg-muted/50 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-[14px] w-36 rounded bg-muted/50 animate-pulse" />
                <div className="h-[11px] w-20 rounded bg-muted/40 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-shrink-0">
                <div className="h-[14px] w-20 rounded bg-muted/50 animate-pulse ml-auto" />
                <div className="h-[11px] w-14 rounded bg-muted/40 animate-pulse ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : parcelas.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden">
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[18px]"
              style={{ backgroundColor: '#FF3B3008' }}
            >
              <Receipt className="h-7 w-7" style={{ color: clr.red }} strokeWidth={1.6} />
            </div>
            <p className="text-[15px] font-semibold mt-2">Nenhuma conta a pagar</p>
            <p className="text-[13px] text-muted-foreground/55 text-center max-w-[220px] leading-relaxed">
              Registre contas a pagar para controlar vencimentos e débitos
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setNovaModalOpen(true)}
              className="mt-3 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-medium text-white min-h-[44px]"
              style={{ backgroundColor: clr.red }}
            >
              <Plus className="h-4 w-4" />
              Nova Conta a Pagar
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Atrasadas */}
          {atrasadas.length > 0 && (
            <div
              className="rounded-2xl bg-white dark:bg-white/[0.05] overflow-hidden"
              style={{ border: `1px solid ${clr.red}30` }}
            >
              <div
                className="flex items-center justify-between px-4 md:px-5 py-[10px]"
                style={{ backgroundColor: `${clr.red}07` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-[7px] w-[7px] rounded-full flex-shrink-0 animate-pulse"
                    style={{ backgroundColor: clr.red }}
                  />
                  <span
                    className="text-[11.5px] font-bold uppercase tracking-[0.55px]"
                    style={{ color: clr.red }}
                  >
                    Atrasadas
                  </span>
                  <span
                    className="text-[10px] font-bold px-[7px] py-[2px] rounded-full"
                    style={{ backgroundColor: `${clr.red}15`, color: clr.red }}
                  >
                    {atrasadas.length}
                  </span>
                </div>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: clr.red }}>
                  {formatCurrency(totalAtrasado)}
                </span>
              </div>
              {atrasadas.map((p, i) => renderParcelaRow(p, { urgency: 'atrasado', border: i > 0 }))}
            </div>
          )}

          {/* Vence Hoje */}
          {venceHoje.length > 0 && (
            <div
              className="rounded-2xl bg-white dark:bg-white/[0.05] overflow-hidden"
              style={{ border: `1px solid ${clr.orange}25` }}
            >
              <div
                className="flex items-center justify-between px-4 md:px-5 py-[10px]"
                style={{ backgroundColor: `${clr.orange}07` }}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" style={{ color: clr.orange }} />
                  <span
                    className="text-[11.5px] font-bold uppercase tracking-[0.55px]"
                    style={{ color: clr.orange }}
                  >
                    Vence Hoje
                  </span>
                </div>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: clr.orange }}>
                  {formatCurrency(venceHoje.reduce((s, p) => s + Number(p.valor), 0))}
                </span>
              </div>
              {venceHoje.map((p, i) => renderParcelaRow(p, { urgency: 'hoje', border: i > 0 }))}
            </div>
          )}

          {/* Próximas — separate card per month */}
          {proximasMeses.map((key, mi) => {
            const grupo = proximasGrouped[key]
            const isFirst = mi === 0 && atrasadas.length === 0 && venceHoje.length === 0
            return (
              <div
                key={key}
                className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-4 md:px-5 py-[10px]"
                  style={{ backgroundColor: isFirst ? `${clr.blue}07` : undefined }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11.5px] font-bold uppercase tracking-[0.55px] capitalize"
                      style={{ color: isFirst ? clr.blue : '#8E8E93' }}
                    >
                      {grupo.mesLabel}
                    </span>
                    {isFirst && (
                      <span
                        className="text-[10px] font-semibold px-[7px] py-[2px] rounded-full"
                        style={{ backgroundColor: `${clr.blue}15`, color: clr.blue }}
                      >
                        Próximo
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[13px] font-bold tabular-nums"
                    style={{ color: isFirst ? clr.blue : '#8E8E93' }}
                  >
                    {formatCurrency(grupo.total)}
                  </span>
                </div>
                {grupo.items.map((p, i) =>
                  renderParcelaRow(p, { urgency: 'normal', border: i > 0 }),
                )}
              </div>
            )
          })}

          {/* Tudo em dia — sem pendentes, com pagas */}
          {noPending && pagas.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden">
              <div className="flex flex-col items-center py-8 px-4 gap-2">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[16px]"
                  style={{ backgroundColor: '#34C75908' }}
                >
                  <CheckCircle2
                    className="h-6 w-6"
                    style={{ color: '#34C759' }}
                    strokeWidth={1.6}
                  />
                </div>
                <p className="text-[14px] font-semibold mt-1">Tudo em dia</p>
                <p className="text-[12px] text-muted-foreground/50 text-center">
                  Todas as contas a pagar estão quitadas
                </p>
              </div>
            </div>
          )}

          {/* Pagas — collapsible */}
          {pagas.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden">
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => setPagasExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 md:px-5 py-[12px] hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#34C759' }} />
                  <span
                    className="text-[11.5px] font-bold uppercase tracking-[0.55px]"
                    style={{ color: '#34C759' }}
                  >
                    Pagas
                  </span>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#34C75912', color: '#34C759' }}
                  >
                    {pagas.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: '#34C759' }}>
                    {formatCurrency(totalPago)}
                  </span>
                  <motion.div
                    animate={{ rotate: pagasExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                  </motion.div>
                </div>
              </motion.button>

              <AnimatePresence>
                {pagasExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/10 dark:border-white/[0.05]">
                      {pagas.map((p, i) => {
                        const desc = p.contas_pagar?.descricao ?? '—'
                        const categoria = p.contas_pagar?.categoria ?? 'Outros'
                        const hasNF = !!p.contas_pagar?.nf_id
                        const isMulti = p.total_parcelas > 1
                        const dateStr = p.pago_em ?? p.vencimento
                        const parsedDate = new Date(`${dateStr}T12:00:00`)
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              'flex items-center gap-3 px-4 md:px-5 py-3 group',
                              i > 0 && 'border-t border-border/[0.07] dark:border-white/[0.04]',
                            )}
                          >
                            <div
                              className="flex h-[38px] w-[38px] flex-col items-center justify-center rounded-[10px] flex-shrink-0"
                              style={{ backgroundColor: '#34C75908' }}
                            >
                              <span
                                className="text-[9px] font-bold uppercase leading-none tracking-wide"
                                style={{ color: '#34C75970' }}
                              >
                                {parsedDate
                                  .toLocaleDateString('pt-BR', { month: 'short' })
                                  .replace('.', '')}
                              </span>
                              <span
                                className="text-[16px] font-bold leading-tight tabular-nums"
                                style={{ color: '#34C759' }}
                              >
                                {parsedDate.getDate()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-muted-foreground/70 truncate line-through">
                                {desc}
                              </p>
                              <div className="flex items-center gap-1.5 mt-[2px] flex-wrap">
                                <span className="text-[11px] text-muted-foreground/40">
                                  {categoria}
                                </span>
                                {hasNF && (
                                  <span
                                    className="text-[10px] font-semibold px-[5px] py-[1px] rounded-full"
                                    style={{ backgroundColor: `${clr.blue}10`, color: clr.blue }}
                                  >
                                    NF
                                  </span>
                                )}
                                {isMulti && (
                                  <span className="text-[11px] text-muted-foreground/30">
                                    {p.numero_parcela}/{p.total_parcelas}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-[4px] flex-shrink-0">
                              <span className="text-[13px] font-semibold tabular-nums text-muted-foreground/50">
                                {formatCurrency(Number(p.valor))}
                              </span>
                              <span className="text-[10px] text-muted-foreground/30">
                                {parsedDate.toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setDeleteId(p.conta_pagar_id)}
                                className="flex h-[22px] w-[22px] items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: '#FF3B3012' }}
                              >
                                <Trash2 className="h-3 w-3" style={{ color: clr.red }} />
                              </motion.button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nova Conta a Pagar */}
      <NovaContaPagarModal open={novaModalOpen} setOpen={setNovaModalOpen} obras={obras} />

      {/* Modal: Pagar Parcela — card-based bank picker + balance preview */}
      <PagarParcelaModal
        parcela={pagarModal}
        contas={contas}
        onClose={() => setPagarModal(null)}
        onConfirm={handlePagarParcela}
        isPending={pagarMutation.isPending}
      />

      {/* Modal: Confirmar Exclusão — Apple sheet design */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null)
        }}
      >
        <DialogContent className={modalCn}>
          <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-4 pb-2">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Excluir Conta a Pagar
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirme a exclusão permanente de todas as parcelas desta conta.
            </DialogDescription>
            <motion.button
              type="button"
              aria-label="Fechar"
              whileTap={{ scale: 0.86 }}
              onClick={() => setDeleteId(null)}
              className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors focus-visible:outline-none"
            >
              <X className="h-[14px] w-[14px] text-foreground/60" aria-hidden="true" />
            </motion.button>
          </div>

          {/* Warning icon */}
          <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-6">
            <div
              className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] mb-3"
              style={{
                background: 'linear-gradient(145deg, #FF6B6B 0%, #FF3B30 100%)',
                boxShadow: '0 10px 30px rgba(255,59,48,0.38)',
              }}
            >
              <Trash2 className="h-[28px] w-[28px] text-white" />
            </div>
            <p className="text-[15px] font-semibold">Excluir conta?</p>
            <p className="text-[13px] text-muted-foreground/60 text-center mt-1 px-6 leading-relaxed">
              Todas as parcelas serão removidas permanentemente. Esta ação não pode ser desfeita.
            </p>
          </div>

          <div className="px-4 pb-[var(--modal-pb,max(2rem,env(safe-area-inset-bottom)))] sm:pb-6 space-y-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
              className="w-full flex items-center justify-center gap-2 h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight text-white transition-all"
              style={{ backgroundColor: clr.red }}
            >
              {deleteMutation.isPending && (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {deleteMutation.isPending ? 'Excluindo…' : 'Excluir Permanentemente'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteId(null)}
              className="w-full flex items-center justify-center h-[44px] text-[15px] font-medium"
              style={{ color: clr.blue }}
            >
              Cancelar
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
