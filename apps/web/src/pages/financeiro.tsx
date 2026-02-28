import { formatBRL, parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  type FinanceiroConta,
  useAllFinanceiroMovimentacoes,
  useCreateFinanceiroConta,
  useCreateFinanceiroMovimentacao,
  useDashboardStats,
  useDeleteFinanceiroConta,
  useEstoqueAlertas,
  useFinanceiroContas,
  useObras,
} from '@/hooks/use-supabase'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Package,
  Plus,
  Receipt,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useState } from 'react'

/* Apple System Colors */
const clr = { blue: '#007AFF', green: '#34C759', red: '#FF3B30', orange: '#FF9500' }

/* Accent palette for account cards */
const accents = [
  { bg: '#007AFF12', fg: '#007AFF' },
  { bg: '#34C75912', fg: '#34C759' },
  { bg: '#FF9F0A12', fg: '#FF9F0A' },
  { bg: '#AF52DE12', fg: '#AF52DE' },
  { bg: '#FF375F12', fg: '#FF375F' },
  { bg: '#5AC8FA12', fg: '#5AC8FA' },
  { bg: '#30B0C712', fg: '#30B0C7' },
  { bg: '#FF634712', fg: '#FF6347' },
]

/* SVG Ring */
function Ring({
  percent,
  size = 80,
  stroke = 6,
  color,
}: { percent: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size }}
      className="flex-shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-muted/40"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(Math.min(percent, 100) / 100) * circ} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  )
}
function ringColor(p: number) {
  return p > 90 ? clr.red : p > 70 ? clr.orange : clr.green
}

const tipos: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }> = {
  ENTRADA: { label: 'Entrada', icon: ArrowDownRight, tint: clr.green },
  SAIDA: { label: 'Saída', icon: ArrowUpRight, tint: clr.red },
  TRANSFERENCIA: { label: 'Transferência', icon: ArrowLeftRight, tint: clr.blue },
}

/* ─── Modal className — iOS system sheet ─── */
const modalCn =
  'p-0 gap-0 border-0 dark:border dark:border-white/[0.07] sm:max-w-[390px] sm:rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col overflow-y-hidden'

export function FinanceiroPage() {
  const navigate = useNavigate()

  const { data: stats } = useDashboardStats()
  const { data: alertasData } = useEstoqueAlertas()
  const { data: obrasData } = useObras()
  const { data: contas = [], isLoading: contasLoading } = useFinanceiroContas()
  const { data: todasMovs = [], isLoading: movsLoading } = useAllFinanceiroMovimentacoes()
  const createConta = useCreateFinanceiroConta()
  const deleteConta = useDeleteFinanceiroConta()
  const createMov = useCreateFinanceiroMovimentacao()

  const s = stats
  const alertas = alertasData || []
  const pct =
    s?.orcamentoTotal && s.orcamentoTotal > 0
      ? Math.round((s.custoTotal / s.orcamentoTotal) * 100)
      : 0

  /* Terrenos em Standby */
  const terrenosStandby = (obrasData || []).filter((o: any) => o.status === 'TERRENO')
  const totalTerrenos = terrenosStandby.reduce(
    (sum: number, o: any) => sum + (o.valor_terreno ?? 0),
    0,
  )

  /* Saldo consolidado de todas as contas bancárias */
  const totalCaixa = contas.reduce((sum, c) => sum + (Number(c.valor_caixa) || 0), 0)
  const totalAplicado = contas.reduce((sum, c) => sum + (Number(c.valor_aplicado) || 0), 0)
  const totalDisponivel = totalCaixa + totalAplicado

  /* ─── Meta financeira — persisted in localStorage ─── */
  const [meta, setMeta] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem('financeiro_meta') || '0') || 0 } catch { return 0 }
  })
  const [metaModalOpen, setMetaModalOpen] = useState(false)
  const [metaInput, setMetaInput] = useState('')

  const metaPct = meta > 0 ? Math.min(Math.round((totalDisponivel / meta) * 100), 100) : 0
  const metaRingColor = meta === 0 ? '#8E8E9360' : metaPct >= 100 ? '#34C759' : '#007AFF'

  /* ─── Add Conta modal state ─── */
  const [modalOpen, setModalOpen] = useState(false)
  const [banco, setBanco] = useState('')
  const [agencia, setAgencia] = useState('')
  const [numeroConta, setNumeroConta] = useState('')
  const [valorInicial, setValorInicial] = useState('')
  const [subcontaNova, setSubcontaNova] = useState<'CAIXA' | 'APLICADO'>('CAIXA')

  const resetForm = () => {
    setBanco('')
    setAgencia('')
    setNumeroConta('')
    setValorInicial('')
    setSubcontaNova('CAIXA')
  }

  const handleOpenModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const handleAddConta = async () => {
    if (!banco.trim()) return
    const v = parseCurrency(valorInicial)
    const novaConta = await createConta.mutateAsync({
      banco: banco.trim(),
      agencia: agencia.trim(),
      numero_conta: numeroConta.trim(),
      valor_caixa: subcontaNova === 'CAIXA' ? v : 0,
      valor_aplicado: subcontaNova === 'APLICADO' ? v : 0,
    })

    if (v > 0) {
      const today = new Date().toISOString().split('T')[0]
      await createMov.mutateAsync({
        conta_id: novaConta.id,
        tipo: 'ENTRADA',
        subconta: subcontaNova,
        motivo: `Saldo Inicial (${subcontaNova === 'CAIXA' ? 'Em Caixa' : 'Aplicações'})`,
        valor: v,
        data: today,
        transferencia_destino_id: null,
      })
    }

    setModalOpen(false)
    resetForm()
  }

  const handleDeleteConta = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteConta.mutate(id)
  }

  /* ─── Helpers ─── */
  const contaSubLabel = (c: FinanceiroConta) =>
    [c.agencia ? `Ag. ${c.agencia}` : '', c.numero_conta ? `CC. ${c.numero_conta}` : '']
      .filter(Boolean)
      .join('  ·  ')

  return (
    <div className="pb-20 pt-8 md:pt-10">
      {/* ─── Saldo Disponível — Apple Wallet hero card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="px-4 md:px-6"
      >
        <div className="rounded-2xl bg-card border p-6 md:p-8">
          {/* Label + hero amount */}
          <p className="text-[13px] font-medium text-muted-foreground tracking-wide uppercase">
            Saldo Disponível
          </p>
          {contasLoading ? (
            <div className="h-[38px] w-48 rounded-lg bg-muted/60 animate-pulse mt-2" />
          ) : (
            <p className="text-[34px] md:text-[40px] font-bold tabular-nums tracking-tight leading-none mt-2">
              {formatCurrency(totalDisponivel)}
            </p>
          )}

          {/* Breakdown: Em Caixa · Aplicações — inline Apple style */}
          <div className="flex items-center gap-5 mt-4">
            <div className="flex items-center gap-2">
              <span
                className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px]"
                style={{ backgroundColor: '#34C75912' }}
              >
                <Wallet className="h-3 w-3" style={{ color: '#34C759' }} />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground/70 leading-none">Em Caixa</span>
                {contasLoading ? (
                  <div className="h-[16px] w-16 rounded bg-muted/60 animate-pulse mt-0.5" />
                ) : (
                  <span className="text-[15px] font-semibold tabular-nums leading-tight mt-0.5" style={{ color: '#34C759' }}>
                    {formatCurrency(totalCaixa)}
                  </span>
                )}
              </div>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div className="flex items-center gap-2">
              <span
                className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px]"
                style={{ backgroundColor: '#007AFF12' }}
              >
                <FileText className="h-3 w-3" style={{ color: '#007AFF' }} />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground/70 leading-none">Aplicações</span>
                {contasLoading ? (
                  <div className="h-[16px] w-16 rounded bg-muted/60 animate-pulse mt-0.5" />
                ) : (
                  <span className="text-[15px] font-semibold tabular-nums leading-tight mt-0.5" style={{ color: '#007AFF' }}>
                    {formatCurrency(totalAplicado)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Meta — Apple Savings Goal: clean progress section */}
          {meta > 0 ? (
            <div className="mt-6 pt-5 border-t border-border/15">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-medium text-muted-foreground">Meta</span>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setMetaInput(formatBRL(meta.toFixed(2).replace('.', ',')))
                    setMetaModalOpen(true)
                  }}
                  className="text-[13px] font-medium transition-colors focus:outline-none min-h-[28px] flex items-center tabular-nums"
                  style={{ color: '#007AFF' }}
                >
                  {formatCurrency(meta)}
                </motion.button>
              </div>
              <div className="h-[6px] rounded-full overflow-hidden bg-border/20">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${metaPct}%` }}
                  transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ backgroundColor: metaPct >= 100 ? '#34C759' : '#007AFF' }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                {metaPct >= 100 ? (
                  <span className="text-[12px] font-medium flex items-center gap-1" style={{ color: '#34C759' }}>
                    <CheckCircle2 className="h-3 w-3" />
                    Meta atingida
                  </span>
                ) : (
                  <span className="text-[12px] text-muted-foreground/60 tabular-nums">
                    Faltam <span className="font-semibold text-foreground/70">{formatCurrency(Math.max(meta - totalDisponivel, 0))}</span>
                  </span>
                )}
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: metaPct >= 100 ? '#34C759' : '#007AFF' }}>
                  {metaPct}%
                </span>
              </div>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setMetaInput(''); setMetaModalOpen(true) }}
              className="mt-6 pt-5 border-t border-border/15 w-full flex items-center gap-2 text-[14px] font-medium transition-colors focus:outline-none min-h-[44px]"
              style={{ color: '#007AFF' }}
            >
              <Target className="h-4 w-4 flex-shrink-0" />
              Definir meta financeira
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ─── Insights row — Apple compact metric cards ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="px-4 md:px-6 mt-4 grid grid-cols-2 gap-3"
      >
        {/* Orçamento Obras */}
        <motion.div
          className="rounded-2xl bg-card border p-4 md:p-5 cursor-pointer"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate({ to: '/obras' })}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0"
              style={{ backgroundColor: '#007AFF10' }}
            >
              <Wallet className="h-[17px] w-[17px]" style={{ color: '#007AFF' }} />
            </span>
            <span className="text-[13px] font-medium text-muted-foreground leading-tight">
              Orçamento Obras
            </span>
          </div>
          <p className="text-[22px] md:text-[26px] font-bold tabular-nums leading-none tracking-tight">
            {formatCurrency(s?.custoTotal ?? 0)}
          </p>
          <div className="mt-3">
            <div className="h-[4px] rounded-full overflow-hidden bg-border/20">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ backgroundColor: ringColor(pct) }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                de {formatCurrency(s?.orcamentoTotal ?? 0)}
              </span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: ringColor(pct) }}>
                {pct}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Terrenos em Standby */}
        <motion.div
          className="rounded-2xl bg-card border p-4 md:p-5 cursor-pointer"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate({ to: '/obras' })}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0"
              style={{ backgroundColor: '#AF52DE10' }}
            >
              <Landmark className="h-[17px] w-[17px]" style={{ color: '#AF52DE' }} />
            </span>
            <span className="text-[13px] font-medium text-muted-foreground leading-tight">
              Terrenos Standby
            </span>
          </div>
          <p
            className="text-[22px] md:text-[26px] font-bold tabular-nums leading-none tracking-tight"
            style={{ color: terrenosStandby.length > 0 ? '#AF52DE' : undefined }}
          >
            {formatCurrency(totalTerrenos)}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-muted-foreground/60">Capital imobilizado</span>
            {terrenosStandby.length > 0 && (
              <span
                className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#AF52DE10', color: '#AF52DE' }}
              >
                {terrenosStandby.length} {terrenosStandby.length === 1 ? 'terreno' : 'terrenos'}
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>

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

        <AnimatePresence mode="popLayout">
          {contasLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center py-16"
            >
              <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </motion.div>
          ) : contas.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
                style={{ backgroundColor: '#007AFF10' }}
              >
                <CreditCard className="h-7 w-7" style={{ color: '#007AFF' }} />
              </span>
              <p className="text-[17px] font-semibold">Nenhuma conta cadastrada</p>
              <p className="text-[14px] text-muted-foreground mt-1.5 text-center max-w-[240px] leading-relaxed">
                Adicione suas contas bancárias para acompanhar o saldo
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenModal}
                className="mt-6 flex items-center gap-1.5 px-5 py-3 rounded-xl text-[15px] font-medium text-white transition-opacity hover:opacity-90 min-h-[48px]"
                style={{ backgroundColor: '#007AFF' }}
              >
                <Plus className="h-4 w-4" />
                Adicionar Conta
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {contas.map((conta, i) => {
                const accent = accents[i % accents.length]
                const total = (Number(conta.valor_caixa) || 0) + (Number(conta.valor_aplicado) || 0)
                const sub = contaSubLabel(conta)
                return (
                  <motion.div
                    key={conta.id}
                    layout
                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      navigate({ to: '/financeiro/$contaId', params: { contaId: conta.id } })
                    }
                    className="rounded-[20px] bg-card border shadow-sm shadow-black/[0.04] p-5 md:p-6 relative overflow-hidden group cursor-pointer active:scale-[0.97] transition-transform"
                  >
                    {/* Delete */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleDeleteConta(conta.id, e)}
                      className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: '#FF3B3012' }}
                    >
                      <Trash2 className="h-4 w-4" style={{ color: clr.red }} />
                    </motion.button>

                    {/* Bank icon */}
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-[12px] mb-4"
                      style={{ backgroundColor: accent.bg }}
                    >
                      <Landmark className="h-[18px] w-[18px]" style={{ color: accent.fg }} />
                    </span>

                    {/* Bank name */}
                    <p className="text-[16px] font-semibold truncate pr-9">{conta.banco}</p>

                    {/* Agencia + Numero */}
                    {sub && (
                      <p className="flex items-center gap-1 text-[13px] text-muted-foreground mt-0.5 truncate">
                        <CreditCard className="h-3 w-3 shrink-0 opacity-50" />
                        <span className="truncate">{sub}</span>
                      </p>
                    )}

                    {/* Total */}
                    <p className="text-[26px] md:text-[28px] font-bold tabular-nums tracking-tight leading-none mt-3 whitespace-nowrap">
                      {formatCurrency(total)}
                    </p>

                    {/* Em Caixa / Aplicações breakdown */}
                    <div className="flex items-stretch gap-3 mt-4 pt-4 border-t border-border/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                            style={{ backgroundColor: '#34C75914' }}
                          >
                            <Wallet className="h-3 w-3" style={{ color: '#34C759' }} />
                          </span>
                          <p className="text-[11px] text-muted-foreground">Em Caixa</p>
                        </div>
                        <p
                          className="text-[14px] font-semibold tabular-nums leading-none whitespace-nowrap"
                          style={{ color: '#34C759' }}
                        >
                          {formatCurrency(Number(conta.valor_caixa) || 0)}
                        </p>
                      </div>
                      <div className="w-px bg-border/30 self-stretch" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                            style={{ backgroundColor: '#007AFF14' }}
                          >
                            <FileText className="h-3 w-3" style={{ color: '#007AFF' }} />
                          </span>
                          <p className="text-[11px] text-muted-foreground">Aplicações</p>
                        </div>
                        <p
                          className="text-[14px] font-semibold tabular-nums leading-none whitespace-nowrap"
                          style={{ color: '#007AFF' }}
                        >
                          {formatCurrency(Number(conta.valor_aplicado) || 0)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Alertas de Estoque ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="px-4 md:px-6 mt-10"
      >
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="flex items-center gap-3 px-4 md:px-5 pt-4 pb-3 border-b border-border/20">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0"
              style={{ backgroundColor: alertas.length > 0 ? '#FF3B3018' : '#34C75918' }}
            >
              {alertas.length > 0 ? (
                <AlertTriangle className="h-4 w-4" style={{ color: clr.red }} />
              ) : (
                <CheckCircle2 className="h-4 w-4" style={{ color: clr.green }} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-none">
                {alertas.length > 0 ? 'Itens com Estoque Baixo' : 'Estoque em Dia'}
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {alertas.length > 0
                  ? `${alertas.length} ${alertas.length === 1 ? 'material abaixo do mínimo' : 'materiais abaixo do mínimo'}`
                  : 'Nenhum item abaixo do mínimo'}
              </p>
            </div>
          </div>

          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: '#34C75918' }}
              >
                <CheckCircle2 className="h-6 w-6" style={{ color: clr.green }} />
              </div>
              <p className="text-[15px] font-semibold mt-2">Todos os materiais em dia</p>
              <p className="text-[13px] text-muted-foreground text-center max-w-[220px]">
                Todos os estoques estão acima do mínimo requerido
              </p>
            </div>
          ) : (
            alertas.map((alerta: any, i: number) => {
              const qty = alerta.quantidade ?? 0
              const min = alerta.estoque_minimo ?? 0
              const isCritical = qty === 0
              const pctStock = min > 0 ? Math.min((qty / min) * 100, 100) : 0
              const accentColor = isCritical ? clr.red : clr.orange
              return (
                <div
                  key={alerta.id}
                  className={cn(
                    'flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4',
                    i > 0 && 'border-t border-border/15',
                  )}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ backgroundColor: `${accentColor}14` }}
                  >
                    <Package className="h-5 w-5" style={{ color: accentColor }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[15px] font-medium truncate leading-snug">
                        {alerta.material_nome ?? '—'}
                      </p>
                      <span
                        className="flex-shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isCritical ? '#FF3B3018' : '#FF950018',
                          color: accentColor,
                        }}
                      >
                        {isCritical ? 'Sem estoque' : 'Baixo'}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground truncate">
                      {alerta.almoxarifado_nome ?? '—'} · {alerta.obra_nome ?? '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pctStock}%`, backgroundColor: accentColor }}
                        />
                      </div>
                      <span className="text-[12px] tabular-nums text-muted-foreground flex-shrink-0">
                        {formatNumber(qty)} / {formatNumber(min)} un.
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </motion.div>

      {/* ─── Movimentações — todas as contas ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="px-4 md:px-6 mt-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Movimentações</h2>
          {!movsLoading && todasMovs.length > 0 && (
            <span className="text-[13px] text-muted-foreground font-medium tabular-nums">
              {todasMovs.length} {todasMovs.length === 1 ? 'registro' : 'registros'}
            </span>
          )}
        </div>

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
          ) : (
            todasMovs.map((mov: any, i: number) => {
              const t = tipos[mov.tipo] ?? tipos.ENTRADA
              const Icon = t.icon
              const isEntrada = mov.tipo === 'ENTRADA'
              const isSaida = mov.tipo === 'SAIDA'
              const isTransf = mov.tipo === 'TRANSFERENCIA'
              const banco = mov.financeiro_contas?.banco ?? '—'
              const subconta = mov.subconta === 'CAIXA' ? 'Em Caixa' : 'Aplicações'
              const amountColor = isTransf ? clr.blue : isSaida ? clr.red : clr.green

              return (
                <div
                  key={mov.id}
                  className={cn(
                    'flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4 transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]',
                    i > 0 && 'border-t border-border/20',
                  )}
                >
                  {/* Ícone colorido por tipo */}
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ backgroundColor: `${t.tint}14` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: t.tint }} />
                  </span>

                  {/* Motivo + banco · subconta */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] md:text-[16px] font-medium truncate leading-snug">
                      {mov.motivo ?? '—'}
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                      {banco}
                      <span className="mx-1 opacity-40">·</span>
                      {subconta}
                    </p>
                  </div>

                  {/* Valor + data */}
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-[16px] font-semibold tabular-nums"
                      style={{ color: amountColor }}
                    >
                      {isTransf ? '' : isEntrada ? '+' : '−'}
                      {formatCurrency(mov.valor ?? 0)}
                    </p>
                    <p className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
                      {formatDate(mov.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════
                MODAL: Nova Conta — iOS Sheet
            ══════════════════════════════════════════ */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className={modalCn}>
          {/* ── Cabeçalho fixo: título centrado + botão fechar ── */}
          <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-4 pb-2">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Nova Conta
            </DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados da nova conta bancária.</DialogDescription>
            <motion.button
              whileTap={{ scale: 0.86 }}
              onClick={() => {
                setModalOpen(false)
                resetForm()
              }}
              className="absolute right-4 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors"
            >
              <X className="h-[14px] w-[14px] text-foreground/60" />
            </motion.button>
          </div>

          {/* ── Ícone + subtítulo (parte do header fixo) ── */}
          <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-7">
            <div
              className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] mb-3 flex-shrink-0"
              style={{
                background: 'linear-gradient(145deg, #2196FF 0%, #0050D8 100%)',
                boxShadow: '0 10px 30px rgba(0,122,255,0.40)',
              }}
            >
              <Landmark className="h-[28px] w-[28px] text-white" />
            </div>
            <p className="text-[13px] text-foreground/40">Dados da conta bancária</p>
          </div>

          {/* ── Formulário agrupado — área rolável ── */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-[10px] pb-3">
            {/* Grupo 1: informações do banco */}
            <div className="rounded-[14px] overflow-hidden bg-white dark:bg-white/[0.07]">
              {/* Banco */}
              <div className="flex items-center min-h-[52px] px-4 gap-3">
                <span className="text-[16px] font-medium w-[80px] flex-shrink-0 text-foreground">
                  Banco
                </span>
                <input
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder="Itaú, Nubank…"
                  autoComplete="organization"
                  className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 placeholder:text-black/20 dark:placeholder:text-white/20"
                />
              </div>

              <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />

              {/* Agência */}
              <div className="flex items-center min-h-[52px] px-4 gap-3">
                <span className="text-[16px] font-medium w-[80px] flex-shrink-0 text-foreground">
                  Agência
                </span>
                <input
                  value={agencia}
                  onChange={(e) => setAgencia(e.target.value)}
                  placeholder="0001"
                  inputMode="numeric"
                  className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 tabular-nums placeholder:text-black/20 dark:placeholder:text-white/20"
                />
              </div>

              <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />

              {/* Número da conta */}
              <div className="flex items-center min-h-[52px] px-4 gap-3">
                <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                  Conta
                </span>
                <span className="text-[12px] text-foreground/35 flex-shrink-0">opcional</span>
                <input
                  value={numeroConta}
                  onChange={(e) => setNumeroConta(e.target.value)}
                  placeholder="12345-6"
                  className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 tabular-nums placeholder:text-black/20 dark:placeholder:text-white/20"
                />
              </div>
            </div>

            {/* Grupo 2: saldo inicial — subconta picker + valor único */}
            <div className="rounded-[14px] overflow-hidden bg-white dark:bg-white/[0.07]">
              {/* Segmented control — Em Caixa | Aplicações (CSS-only indicator, no layoutId to avoid Portal freeze) */}
              <div className="px-3 py-[10px]">
                <div className="relative flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
                  {/* Sliding indicator — pure CSS */}
                  <div
                    className="absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] bg-white dark:bg-white/[0.14] rounded-[8px] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] pointer-events-none"
                    style={{ transform: subcontaNova === 'APLICADO' ? 'translateX(calc(100% + 3px))' : 'translateX(0)' }}
                  />
                  {/* Em Caixa */}
                  <button
                    type="button"
                    onClick={() => setSubcontaNova('CAIXA')}
                    className={cn(
                      'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[14px] font-medium transition-colors z-10',
                      subcontaNova !== 'CAIXA' && 'text-foreground/40',
                    )}
                    style={{ color: subcontaNova === 'CAIXA' ? '#34C759' : undefined }}
                  >
                    <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Em Caixa</span>
                  </button>

                  {/* Aplicações */}
                  <button
                    type="button"
                    onClick={() => setSubcontaNova('APLICADO')}
                    className={cn(
                      'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[14px] font-medium transition-colors z-10',
                      subcontaNova !== 'APLICADO' && 'text-foreground/40',
                    )}
                    style={{ color: subcontaNova === 'APLICADO' ? '#007AFF' : undefined }}
                  >
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Aplicações</span>
                  </button>
                </div>
              </div>

              <div className="h-px mx-4 bg-black/[0.07] dark:bg-white/[0.07]" />

              {/* Valor único alinhado à direita */}
              <div className="flex items-center min-h-[52px] px-4 gap-3">
                <span className="text-[16px] font-medium flex-shrink-0 text-foreground/55">
                  Saldo Inicial
                </span>
                <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                  <span
                    className="text-[14px] flex-shrink-0 font-semibold"
                    style={{ color: subcontaNova === 'CAIXA' ? '#34C75980' : '#007AFF80' }}
                  >
                    R$
                  </span>
                  <input
                    value={valorInicial}
                    onChange={(e) => setValorInicial(formatBRL(e.target.value))}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="text-[16px] text-right bg-transparent outline-none tabular-nums font-semibold min-w-0 w-[130px] placeholder:text-black/20 dark:placeholder:text-white/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA fixo no rodapé ── */}
          <div className="flex-shrink-0 px-4 pt-3 pb-8 sm:pb-6 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-t border-black/[0.05] dark:border-white/[0.05]">
            <motion.button
              whileTap={{ scale: banco.trim() ? 0.97 : 1 }}
              disabled={!banco.trim() || createConta.isPending}
              onClick={handleAddConta}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all',
                banco.trim() && !createConta.isPending
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-black/[0.07] dark:bg-white/[0.07] text-foreground/25 cursor-not-allowed',
              )}
            >
              {createConta.isPending && (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {createConta.isPending ? 'Salvando…' : 'Criar Conta'}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
                MODAL: Meta Financeira — iOS Sheet
            ══════════════════════════════════════════ */}
      <Dialog
        open={metaModalOpen}
        onOpenChange={(v) => {
          setMetaModalOpen(v)
          if (!v) setMetaInput('')
        }}
      >
        <DialogContent className={modalCn}>
          {/* ── Drag handle + título ── */}
          <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-5 pb-0">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-9 h-[5px] rounded-full bg-black/[0.12] dark:bg-white/[0.18]" />
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Meta Financeira
            </DialogTitle>
            <DialogDescription className="sr-only">Defina sua meta de capital disponível.</DialogDescription>
            <motion.button
              whileTap={{ scale: 0.86 }}
              onClick={() => { setMetaModalOpen(false); setMetaInput('') }}
              className="absolute right-4 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] transition-colors"
            >
              <X className="h-[14px] w-[14px] text-foreground/60" />
            </motion.button>
          </div>

          {/* ── Hero: input centralizado — estilo Apple Pay ── */}
          <div className="flex-shrink-0 flex flex-col items-center px-6 pt-8 pb-6">
            <p className="text-[13px] font-medium text-muted-foreground/60 mb-3 tracking-wide uppercase">
              {meta > 0 ? 'Atualizar meta' : 'Definir meta'}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold text-foreground/40">R$</span>
              <input
                value={metaInput}
                onChange={(e) => setMetaInput(formatBRL(e.target.value))}
                placeholder="0,00"
                inputMode="decimal"
                autoFocus
                className="text-[48px] font-bold tabular-nums tracking-tight bg-transparent outline-none min-w-[8ch] max-w-full text-center placeholder:text-foreground/20"
                style={{ width: `${Math.max(metaInput.length + 1, 5)}ch` }}
              />
            </div>

            {/* Disponível hoje — contexto sutil */}
            <p className="text-[13px] text-muted-foreground/50 mt-3 tabular-nums">
              Disponível hoje:{' '}
              <span
                className="font-semibold"
                style={{ color: totalDisponivel > 0 ? '#34C759' : undefined }}
              >
                {formatCurrency(totalDisponivel)}
              </span>
            </p>

            {/* Mini progress preview — só aparece quando o usuário digita */}
            {parseCurrency(metaInput) > 0 && (() => {
              const previewPct = Math.min(Math.round((totalDisponivel / parseCurrency(metaInput)) * 100), 100)
              const previewColor = previewPct >= 100 ? '#34C759' : '#007AFF'
              return (
                <div className="w-full mt-5">
                  <div className="h-[6px] rounded-full overflow-hidden bg-black/[0.06] dark:bg-white/[0.08]">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${previewPct}%` }}
                      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                      style={{ backgroundColor: previewColor }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[12px] text-muted-foreground/50 tabular-nums">
                      {formatCurrency(totalDisponivel)}
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: previewColor }}>
                      {previewPct}%
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ── Rodapé com CTA ── */}
          <div className="flex-shrink-0 px-4 pt-2 pb-8 sm:pb-5 space-y-2">
            <motion.button
              whileTap={{ scale: parseCurrency(metaInput) > 0 ? 0.97 : 1 }}
              disabled={parseCurrency(metaInput) <= 0}
              onClick={() => {
                const v = parseCurrency(metaInput)
                if (v > 0) {
                  setMeta(v)
                  try { localStorage.setItem('financeiro_meta', String(v)) } catch { }
                }
                setMetaModalOpen(false)
                setMetaInput('')
              }}
              className={cn(
                'w-full flex items-center justify-center h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all',
                parseCurrency(metaInput) > 0
                  ? 'text-white'
                  : 'bg-black/[0.07] dark:bg-white/[0.07] text-foreground/25 cursor-not-allowed',
              )}
              style={parseCurrency(metaInput) > 0 ? { backgroundColor: '#007AFF' } : undefined}
            >
              Salvar Meta
            </motion.button>

            {meta > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setMeta(0)
                  try { localStorage.removeItem('financeiro_meta') } catch { }
                  setMetaModalOpen(false)
                  setMetaInput('')
                }}
                className="w-full flex items-center justify-center h-[44px] text-[15px] font-medium transition-colors"
                style={{ color: '#FF3B30' }}
              >
                Remover Meta
              </motion.button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
