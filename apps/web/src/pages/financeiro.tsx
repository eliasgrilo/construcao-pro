import { parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  type FinanceiroConta,
  useCreateFinanceiroConta,
  useCreateFinanceiroMovimentacao,
  useDashboardStats,
  useDeleteFinanceiroConta,
  useEstoqueAlertas,
  useFinanceiroContas,
  useMovimentacoesRecentes,
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
  ChevronRight,
  CreditCard,
  FileText,
  Landmark,
  Package,
  Plus,
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

const statusBreakdown = [
  { key: 'ATIVA', label: 'Ativa', color: '#34C759' },
  { key: 'TERRENO', label: 'Terreno', color: '#AF52DE' },
  { key: 'FINALIZADA', label: 'Finaliz.', color: '#8E8E93' },
  { key: 'VENDIDO', label: 'Vendido', color: '#5856D6' },
]

const tipos: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }> = {
  ENTRADA: { label: 'Entrada', icon: ArrowDownRight, tint: clr.green },
  SAIDA: { label: 'Saída', icon: ArrowUpRight, tint: clr.red },
  TRANSFERENCIA: { label: 'Transferência', icon: ArrowLeftRight, tint: clr.blue },
}

/* ─── Modal className — iOS system sheet ─── */
const modalCn =
  'p-0 gap-0 border-0 dark:border dark:border-white/[0.07] sm:max-w-[390px] sm:rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] overflow-hidden'

export function FinanceiroPage() {
  const navigate = useNavigate()

  const { data: stats } = useDashboardStats()
  const { data: recentMovs } = useMovimentacoesRecentes()
  const { data: alertasData } = useEstoqueAlertas()
  const { data: obrasData } = useObras()
  const { data: contas = [], isLoading: contasLoading } = useFinanceiroContas()
  const createConta = useCreateFinanceiroConta()
  const deleteConta = useDeleteFinanceiroConta()
  const createMov = useCreateFinanceiroMovimentacao()

  const s = stats
  const movs = recentMovs || []
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
      {/* ─── Orçamento Geral ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="px-4 md:px-6"
      >
        <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight mb-4">
          Orçamento Geral
        </h2>
        <div className="rounded-2xl bg-card border p-5 md:p-6">
          <div className="flex items-center gap-5 md:gap-8">
            {/* Ring — always row layout */}
            <div className="relative flex-shrink-0">
              <Ring percent={pct} size={100} stroke={9} color={ringColor(pct)} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-bold tabular-nums leading-none">{pct}%</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                  usado
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[24px] md:text-[32px] font-bold tabular-nums tracking-tight leading-none">
                {formatCurrency(s?.custoTotal ?? 0)}
              </p>
              <p className="text-[14px] md:text-[15px] text-muted-foreground mt-1.5">
                de {formatCurrency(s?.orcamentoTotal ?? 0)} em orçamento
              </p>

              {/* Status breakdown */}
              <div className="flex gap-4 md:gap-5 mt-4 pt-4 border-t border-border/20">
                {statusBreakdown.map((st) => {
                  const count = obrasData?.filter((o: any) => o.status === st.key).length ?? 0
                  return (
                    <motion.div
                      key={st.key}
                      className={cn(
                        'transition-opacity min-w-0',
                        count === 0 ? 'opacity-30' : 'opacity-100',
                      )}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => navigate({ to: '/obras' })}
                      style={{ cursor: 'pointer' }}
                    >
                      <p className="text-[18px] md:text-[22px] font-semibold tabular-nums leading-none">
                        {count}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: st.color }}
                        />
                        <p className="text-[12px] md:text-[13px] text-muted-foreground whitespace-nowrap">
                          {st.label}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Insights row ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="px-4 md:px-6 mt-5 grid grid-cols-2 gap-3"
      >
        {/* Orçamento Geral */}
        <motion.div
          className="rounded-2xl bg-card border p-4 md:p-5 flex flex-col justify-between cursor-pointer h-full"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate({ to: '/obras' })}
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ backgroundColor: '#007AFF15' }}
            >
              <Wallet className="h-5 w-5" style={{ color: '#007AFF' }} />
            </span>
            <div className="relative flex items-center justify-center">
              <Ring percent={pct} size={46} stroke={4} color={ringColor(pct)} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[12px] font-bold tabular-nums leading-none tracking-tight">
                  {pct}%
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[13px] md:text-[14px] text-muted-foreground font-medium mb-1">
              Orçamento Geral
            </p>
            <p className="text-[20px] md:text-[24px] font-bold tabular-nums leading-none tracking-tight mb-1.5">
              {formatCurrency(s?.custoTotal ?? 0)}
            </p>
            <p className="text-[12px] md:text-[13px] text-muted-foreground leading-tight truncate">
              de {formatCurrency(s?.orcamentoTotal ?? 0)}
            </p>
          </div>
        </motion.div>

        {/* Terrenos em Standby */}
        <motion.div
          className="rounded-2xl bg-card border p-4 md:p-5 flex flex-col justify-between cursor-pointer h-full"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate({ to: '/obras' })}
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ backgroundColor: '#AF52DE15' }}
            >
              <Landmark className="h-5 w-5" style={{ color: '#AF52DE' }} />
            </span>
            {terrenosStandby.length > 0 && (
              <span
                className="flex items-center justify-center h-[26px] min-w-[26px] rounded-full text-[13px] font-bold px-2.5"
                style={{ backgroundColor: '#AF52DE15', color: '#AF52DE' }}
              >
                {terrenosStandby.length}
              </span>
            )}
          </div>
          <div>
            <p className="text-[13px] md:text-[14px] text-muted-foreground font-medium mb-1">
              Terrenos Standby
            </p>
            <p
              className="text-[20px] md:text-[24px] font-bold tabular-nums leading-none tracking-tight mb-1.5"
              style={{ color: terrenosStandby.length > 0 ? '#AF52DE' : undefined }}
            >
              {formatCurrency(totalTerrenos)}
            </p>
            <p className="text-[12px] md:text-[13px] text-muted-foreground leading-tight truncate">
              Capital imobilizado
            </p>
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
                    <p className="text-[26px] md:text-[28px] font-bold tabular-nums tracking-tight leading-none mt-3">
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
                          className="text-[14px] font-semibold tabular-nums leading-none"
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
                          className="text-[14px] font-semibold tabular-nums leading-none"
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

      {/* ─── Atividade Recente ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="px-4 md:px-6 mt-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Atividade Recente</h2>
          <button
            onClick={() => navigate({ to: '/movimentacoes' })}
            className="flex items-center text-[15px] text-primary font-medium hover:text-primary/80 transition-colors min-h-[44px]"
          >
            Ver Todas
            <ChevronRight className="h-4 w-4 ml-0.5" />
          </button>
        </div>

        <div className="rounded-2xl bg-card border overflow-hidden">
          {movs.length === 0 ? (
            <p className="text-[15px] text-muted-foreground text-center py-12">
              Nenhuma movimentação.
            </p>
          ) : (
            movs.map((mov: any, i: number) => {
              const t = tipos[mov.tipo] ?? tipos.ENTRADA
              const Icon = t.icon
              const cost =
                mov.quantidade *
                (mov.precoUnitario ?? mov.preco_unitario ?? mov.material?.preco_unitario ?? 0)
              return (
                <div
                  key={mov.id}
                  className={cn(
                    'flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4',
                    i > 0 && 'border-t border-border/20',
                  )}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ backgroundColor: `${t.tint}14` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: t.tint }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] md:text-[16px] font-medium truncate leading-snug">
                      {mov.material?.nome ?? '—'}
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {t.label} · {formatNumber(mov.quantidade)} un
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={cn(
                        'text-[16px] font-semibold tabular-nums',
                        mov.tipo === 'SAIDA' ? 'text-destructive' : 'text-[#34C759]',
                      )}
                    >
                      {mov.tipo === 'SAIDA' ? '−' : '+'}
                      {formatCurrency(cost)}
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
          {/* ── Cabeçalho: título centrado + botão fechar ── */}
          <div className="relative flex items-center justify-center px-5 pt-4 pb-2">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Nova Conta
            </DialogTitle>
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

          {/* ── Ícone + subtítulo ── */}
          <div className="flex flex-col items-center pt-4 pb-7">
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

          {/* ── Formulário agrupado — estilo iOS Settings ── */}
          <div className="px-4 space-y-[10px] pb-3">
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
              {/* Segmented control — Em Caixa | Aplicações */}
              <div className="px-3 py-[10px]">
                <div className="flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
                  {/* Em Caixa */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSubcontaNova('CAIXA')}
                    className={cn(
                      'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[14px] font-medium transition-colors z-10',
                      subcontaNova !== 'CAIXA' && 'text-foreground/40',
                    )}
                    style={{ color: subcontaNova === 'CAIXA' ? '#34C759' : undefined }}
                  >
                    {subcontaNova === 'CAIXA' && (
                      <motion.div
                        layoutId="nova-conta-sc"
                        className="absolute inset-0 bg-white dark:bg-white/[0.14] rounded-[8px] shadow-sm -z-10"
                        transition={{ type: 'spring', bounce: 0.18, duration: 0.36 }}
                      />
                    )}
                    <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Em Caixa</span>
                  </motion.button>

                  {/* Aplicações */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSubcontaNova('APLICADO')}
                    className={cn(
                      'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[14px] font-medium transition-colors z-10',
                      subcontaNova !== 'APLICADO' && 'text-foreground/40',
                    )}
                    style={{ color: subcontaNova === 'APLICADO' ? '#007AFF' : undefined }}
                  >
                    {subcontaNova === 'APLICADO' && (
                      <motion.div
                        layoutId="nova-conta-sc"
                        className="absolute inset-0 bg-white dark:bg-white/[0.14] rounded-[8px] shadow-sm -z-10"
                        transition={{ type: 'spring', bounce: 0.18, duration: 0.36 }}
                      />
                    )}
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Aplicações</span>
                  </motion.button>
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
                    onChange={(e) => setValorInicial(e.target.value.replace(/[^\d,.]/g, ''))}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="text-[16px] text-right bg-transparent outline-none tabular-nums font-semibold min-w-0 w-[130px] placeholder:text-black/20 dark:placeholder:text-white/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="px-4 pt-2 pb-8 sm:pb-6">
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
    </div>
  )
}
