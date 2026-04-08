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
import { iosSheetDialogCn } from './dialog-styles'
import {
  ContasAPagarSection,
  NovaContaPagarModal,
  PagarParcelaModal,
} from './financeiro-contas-pagar'
import {
  ContasAReceberSection,
  NovaContaReceberModal,
  ReceberParcelaModal,
} from './financeiro-contas-receber'
import {
  ContasGrid,
  FinanceiroHeroCard,
  FinanceiroInsightsRow,
  FinanceiroMovimentacoesList,
  MaterialCostTrendPanel,
  MetaFinanceiraModal,
  MovimentacaoListItem,
  NovaContaModal,
  Ring,
  ringColor,
} from './financeiro-widgets'

/* Apple System Colors */
export const clr = { blue: '#007AFF', green: '#34C759', red: '#FF3B30', orange: '#FF9500' }

/* Framer Motion variants — module-level so references are stable across renders */
export const contaListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
} as const
export const contaItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
} as const

/* SVG Ring */
export const tipos: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }> = {
  ENTRADA: { label: 'Entrada', icon: ArrowDownRight, tint: clr.green },
  SAIDA: { label: 'Saída', icon: ArrowUpRight, tint: clr.red },
  TRANSFERENCIA: { label: 'Transferência', icon: ArrowLeftRight, tint: clr.blue },
}

/* ─── Modal className — iOS system sheet ─── */
export const modalCn = iosSheetDialogCn
/* ─── Modal: Nova Conta a Receber ─── */
/* ─── Modal: Confirmar Recebimento ─── */
/* ─── Section: Contas a Receber (redesign completo) ─── */
/* ─── Helpers ─── */
export const contaSubLabel = (c: FinanceiroConta) =>
  [c.agencia ? `Ag. ${c.agencia}` : '', c.numero_conta ? `CC. ${c.numero_conta}` : '']
    .filter(Boolean)
    .join('  ·  ')
/* ═══════════════════════════════════════════════════════════════════════
   MODAL: Nova Conta a Pagar — iOS Sheet
   ═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   MODAL: Confirmar Pagamento — iOS Sheet (card-based bank picker)
   ═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   SECTION: Contas a Pagar — componente isolado com Apple design máximo
   ═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   MaterialCostTrendPanel — Macro insight: material cost trends
   "Seus gastos com materiais subiram X% nos últimos 3 meses"
   ═══════════════════════════════════════════════════════════════ */

export function FinanceiroPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { canManageFinanceiro } = usePermissions()

  const { data: stats } = useDashboardStats()
  const { data: obrasData } = useObras()
  const { data: contas = [], isLoading: contasLoading } = useFinanceiroContas()
  const { data: todasMovs = [], isLoading: movsLoading } = useAllFinanceiroMovimentacoes()
  const createConta = useCreateFinanceiroConta()
  const deleteConta = useDeleteFinanceiroConta()
  const createMov = useCreateFinanceiroMovimentacao()
  const { deleteWithUndo: deleteContaWithUndo } = useUndoableDelete(
    (id: string) => deleteConta.mutateAsync(id),
    {
      pending: 'Conta excluída',
      undone: 'Exclusão cancelada',
      error: 'Erro ao excluir conta',
    },
  )

  const { data: costTrend = [] } = useMaterialCostTrend()

  const s = stats
  const pct =
    s?.orcamentoTotal && s.orcamentoTotal > 0
      ? Math.round((s.custoTotal / s.orcamentoTotal) * 100)
      : 0

  /* Terrenos em Standby */
  const terrenosStandby = (obrasData || []).filter((o: ObraRow) => o.status === 'TERRENO')
  const totalTerrenos = terrenosStandby.reduce(
    (sum: number, o: ObraRow) => sum + (o.valor_terreno ?? 0),
    0,
  )

  /* Saldo consolidado de todas as contas bancárias */
  const totalCaixa = contas.reduce((sum, c) => sum + (Number(c.valor_caixa) || 0), 0)
  const totalAplicado = contas.reduce((sum, c) => sum + (Number(c.valor_aplicado) || 0), 0)
  const totalDisponivel = totalCaixa + totalAplicado

  /* ─── Meta financeira — sincronizado na nuvem (Supabase) ─── */
  const { data: metaData } = useFinanceiroMeta()
  const upsertMeta = useUpsertFinanceiroMeta()
  const meta = metaData?.valor ?? 0
  const [metaModalOpen, setMetaModalOpen] = useState(false)
  const [metaInput, setMetaInput] = useState('')

  // No Math.min cap: values above 100% mean the balance exceeds the target (good for reserve goals).
  const metaPct = meta > 0 ? Math.round((totalDisponivel / meta) * 100) : 0
  const metaRingColor =
    meta === 0 ? '#8E8E9360' : metaPct >= 100 ? '#34C759' : metaPct < 25 ? '#FF3B30' : '#007AFF'

  /* ─── Add Conta modal state ─── */
  const [modalOpen, setModalOpen] = useState(false)

  const contaForm = useForm<CreateFinanceiroContaInput>({
    resolver: zodResolver(createFinanceiroContaSchema),
    mode: 'onTouched',
    defaultValues: {
      banco: '',
      agencia: '',
      numeroConta: '',
      valorInicial: 0,
      subconta: 'CAIXA',
      tipo: 'Corrente',
    },
  })
  const { clearDraft: clearContaDraft } = useFormDraft(contaForm, 'nova-conta')
  const resetForm = () => {
    contaForm.reset()
    clearContaDraft()
  }

  const handleOpenModal = () => {
    setModalOpen(true)
  }

  const handleAddConta = contaForm.handleSubmit((data) => {
    createConta.mutate(
      {
        banco: data.banco,
        agencia: data.agencia ?? '',
        numero_conta: data.numeroConta ?? '',
        tipo: data.tipo,
        valor_caixa: data.subconta === 'CAIXA' ? data.valorInicial : 0,
        valor_aplicado: data.subconta === 'APLICADO' ? data.valorInicial : 0,
      },
      {
        onSuccess: (novaConta) => {
          if (data.valorInicial > 0) {
            const today = todayISO()
            createMov.mutate(
              {
                conta_id: novaConta.id,
                tipo: 'ENTRADA',
                subconta: data.subconta,
                motivo: `Saldo Inicial (${data.subconta === 'CAIXA' ? 'Em Caixa' : 'Aplicações'})`,
                valor: data.valorInicial,
                data: today,
                transferencia_destino_id: null,
              },
              {
                onError: () => {
                  toast({
                    title: 'Conta criada, mas falha ao registrar saldo inicial',
                    variant: 'error',
                  })
                },
              },
            )
          }
          toast({ title: 'Conta criada com sucesso', variant: 'success' })
          setModalOpen(false)
          resetForm()
        },
        onError: () => {
          toast({ title: 'Erro ao criar conta bancária', variant: 'error' })
        },
      },
    )
  })

  const handleDeleteConta = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteContaWithUndo(id)
  }

  return (
    <div className="pb-20 pt-8 md:pt-10">
      {/* ─── Saldo Disponível — Apple Wallet hero card ─── */}
      <FinanceiroHeroCard
        contasLoading={contasLoading}
        totalDisponivel={totalDisponivel}
        totalCaixa={totalCaixa}
        totalAplicado={totalAplicado}
        meta={meta}
        metaPct={metaPct}
        setMetaModalOpen={setMetaModalOpen}
        setMetaInput={setMetaInput}
      />

      {/* ─── Insights row — Apple compact metric cards ─── */}
      <FinanceiroInsightsRow
        s={s}
        pct={pct}
        terrenosStandby={terrenosStandby}
        totalTerrenos={totalTerrenos}
        navigate={navigate}
      />

      {/* ─── Gastos com Materiais — Cost Trend Panel ─── */}
      {costTrend.length >= 2 && <MaterialCostTrendPanel costTrend={costTrend} />}

      {/* ─── Contas ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-10 px-4 md:px-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Contas</h2>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 text-[15px] text-primary font-medium hover:text-primary/80 transition-colors min-h-[44px] px-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar Conta
          </motion.button>
        </div>

        <ContasGrid
          contasLoading={contasLoading}
          contas={contas}
          handleOpenModal={handleOpenModal}
          handleDeleteConta={handleDeleteConta}
          canManageFinanceiro={canManageFinanceiro}
        />
      </motion.div>

      {/* ─── Contas a Receber ─── */}
      <ContasAReceberSection contas={contas} obras={obrasData ?? []} />

      {/* ─── Contas a Pagar ─── */}
      <ContasAPagarSection contas={contas} obras={obrasData ?? []} />

      {/* ─── Movimentações — todas as contas ─── */}
      <FinanceiroMovimentacoesList
        movsLoading={movsLoading}
        todasMovs={todasMovs}
        contas={contas}
      />

      {/* ── Modais Auxiliares ── */}
      <NovaContaModal
        modalOpen={modalOpen}
        setModalOpen={(open) => {
          setModalOpen(open)
          if (!open) resetForm()
        }}
        form={contaForm}
        handleAddConta={handleAddConta}
        isPending={createConta.isPending || createMov.isPending}
      />

      <MetaFinanceiraModal
        metaModalOpen={metaModalOpen}
        setMetaModalOpen={setMetaModalOpen}
        metaInput={metaInput}
        setMetaInput={setMetaInput}
        meta={meta}
        totalDisponivel={totalDisponivel}
        upsertMeta={upsertMeta}
      />
    </div>
  )
}
