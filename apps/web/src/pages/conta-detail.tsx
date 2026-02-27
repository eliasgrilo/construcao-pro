import { Button } from '@/components/ui/button'
import { parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { useNavigate, useParams } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFinanceiroContas, useFinanceiroMovimentacoes, useCreateFinanceiroMovimentacao, useDeleteFinanceiroMovimentacao, useUpdateFinanceiroConta } from '@/hooks/use-supabase'

/* ─── Types ─── */
interface Conta {
  id: string
  banco: string
  agencia: string
  numeroConta: string
  valorCaixa: number
  valorAplicado: number
}

type TipoMov = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'

interface MovimentacaoConta {
  id: string
  tipo: TipoMov
  subconta: 'CAIXA' | 'APLICADO'
  motivo: string
  valor: number
  data: string
  createdAt: string
  /** 'SWITCH' = troca interna Caixa↔Aplicado · contaId = outra conta cadastrada */
  transferenciaDestinoId?: string
}

/* ─── UUID polyfill (crypto.randomUUID not available or crashing on iOS < 15.4 / non-https) ─── */
function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch (e) {
    /* fallback */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}



/* ─── Dates ─── */
function todayStr() {
  return new Date().toISOString().split('T')[0]
}
function weekAgoStr() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}
function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function groupLabel(date: string): string {
  if (date === todayStr()) return 'Hoje'
  if (date > weekAgoStr()) return 'Esta Semana'
  return 'Anteriores'
}

/* ─── Palette ─── */
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

/* ─── Tipo config ─── */
const TIPO_CFG: Record<
  TipoMov,
  { label: string; btnLabel: string; Icon: React.ElementType; color: string; iconBg: string }
> = {
  ENTRADA: {
    label: 'Entrada',
    btnLabel: 'Confirmar',
    Icon: ArrowDownRight,
    color: '#34C759',
    iconBg: '#34C75918',
  },
  SAIDA: {
    label: 'Saída',
    btnLabel: 'Confirmar',
    Icon: ArrowUpRight,
    color: '#FF3B30',
    iconBg: '#FF3B3018',
  },
  TRANSFERENCIA: {
    label: 'Transferir',
    btnLabel: 'Transferir',
    Icon: ArrowLeftRight,
    color: '#007AFF',
    iconBg: '#007AFF18',
  },
}

/* subconta display label — "APLICADO" → "Aplicações" everywhere */
const SUBCONTA_LABEL: Record<'CAIXA' | 'APLICADO', string> = {
  CAIXA: 'Em Caixa',
  APLICADO: 'Aplicações',
}

/* ─── Ring ─── */
function Ring({
  percent,
  size = 88,
  stroke = 8,
  color,
}: { percent: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
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
        className="text-muted/30"
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
        strokeDasharray={`${(Math.min(percent, 100) / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  )
}

/* ─── Segmented button (2-option) ─── */
function SegBtn({
  active,
  color,
  onClick,
  children,
  layoutId,
}: {
  active: boolean
  color: string
  onClick: () => void
  children: React.ReactNode
  layoutId: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-medium transition-colors min-h-[42px] z-10 flex-1',
        active ? '' : 'text-muted-foreground hover:text-foreground',
      )}
      style={{ color: active ? color : undefined }}
    >
      {active && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 bg-card rounded-[10px] shadow-sm border border-black/5 dark:border-white/5 -z-10"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        />
      )}
      {children}
    </motion.button>
  )
}

/* ─── Destino card (transfer destination) ─── */
function DestinoCard({
  selected,
  onSelect,
  icon: Icon,
  color,
  iconBg,
  title,
  subtitle,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ElementType
  color: string
  iconBg: string
  title: string
  subtitle: string
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] border text-left transition-all',
        selected
          ? 'border-border/40 bg-card shadow-sm'
          : 'border-border/15 bg-black/[0.015] dark:bg-white/[0.025] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-[12px] flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon className="h-[18px] w-[18px]" style={{ color }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-tight tracking-tight">{title}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      </div>
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}
          >
            <Check className="h-4 w-4 flex-shrink-0" style={{ color }} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/* ══════════════════════════════ */
export function ContaDetailPage() {
  const { contaId } = useParams({ strict: false }) as { contaId: string }
  const navigate = useNavigate()

  /* ─── Supabase State ─── */
  const { data: dbContas = [] } = useFinanceiroContas()
  const contasAll: Conta[] = useMemo(() => dbContas.map((c: any) => ({
    id: c.id,
    banco: c.banco,
    agencia: c.agencia,
    numeroConta: c.numero_conta,
    valorCaixa: c.valor_caixa,
    valorAplicado: c.valor_aplicado
  })), [dbContas])

  const { data: dbMovs = [] } = useFinanceiroMovimentacoes(contaId)
  const movs: MovimentacaoConta[] = useMemo(() => dbMovs.map((m: any) => ({
    id: m.id,
    tipo: m.tipo,
    subconta: m.subconta,
    motivo: m.motivo,
    valor: m.valor,
    data: m.data,
    createdAt: m.created_at,
    transferenciaDestinoId: m.transferencia_destino_id || undefined
  })), [dbMovs])

  const createMov = useCreateFinanceiroMovimentacao()
  const deleteMov = useDeleteFinanceiroMovimentacao()
  const updateConta = useUpdateFinanceiroConta()

  const conta = useMemo(() => contasAll.find((c) => c.id === contaId), [contasAll, contaId])
  const accentIdx = useMemo(() => {
    if (!conta) return 0
    return contasAll.findIndex((c) => c.id === contaId) % accents.length
  }, [conta, contaId, contasAll])
  const accent = accents[accentIdx]

  const baseTotal = (conta?.valorCaixa ?? 0) + (conta?.valorAplicado ?? 0)
  const saldoAtual = baseTotal
  const caixaPct = baseTotal > 0 ? Math.round(((conta?.valorCaixa ?? 0) / baseTotal) * 100) : 0

  const grouped = useMemo(() => {
    const sorted = [...movs].sort((a, b) => {
      const dA = String(a?.data || '')
      const dB = String(b?.data || '')
      if (dB !== dA) return dB.localeCompare(dA)
      const cA = String(a?.createdAt || '')
      const cB = String(b?.createdAt || '')
      return cB.localeCompare(cA)
    })
    const order = ['Hoje', 'Esta Semana', 'Anteriores']
    const map = new Map<string, MovimentacaoConta[]>()
    for (const m of sorted) {
      const lbl = groupLabel(m.data)
      if (!map.has(lbl)) map.set(lbl, [])
      map.get(lbl)!.push(m)
    }
    return order.filter((k) => map.has(k)).map((k) => ({ label: k, items: map.get(k)! }))
  }, [movs])

  /* ─── Outras contas (para destino de transferência) ─── */
  const outrasContas = useMemo(
    () => contasAll.filter((c) => c.id !== contaId),
    [contasAll, contaId]
  )

  /* ─── Modal state ─── */
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoMov>('ENTRADA')
  const [valor, setValor] = useState('')
  const [subconta, setSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')
  const [motivo, setMotivo] = useState('')
  const [transferenciaDestino, setTransferenciaDestino] = useState<string>('SWITCH')

  function reset() {
    setTipo('ENTRADA')
    setValor('')
    setSubconta('CAIXA')
    setMotivo('')
    setTransferenciaDestino('SWITCH')
  }

  /* ─── Adicionar movimentação ─── */
  async function handleAdd() {
    const v = parseCurrency(valor)
    if (!motivo.trim() || !v || !conta) return

    const isCaixa = subconta === 'CAIXA'
    const payload = {
      conta_id: conta.id,
      tipo,
      subconta,
      motivo: motivo.trim(),
      valor: v,
      data: todayStr(),
      transferencia_destino_id: null as string | null
    }

    if (tipo === 'TRANSFERENCIA') {
      const isSwitch = transferenciaDestino === 'SWITCH'
      const pC = Number(conta.valorCaixa) || 0
      const pA = Number(conta.valorAplicado) || 0
      
      if (isSwitch) {
        await updateConta.mutateAsync({
          id: conta.id,
          valor_caixa: isCaixa ? pC - v : pC + v,
          valor_aplicado: isCaixa ? pA + v : pA - v,
        })
        payload.transferencia_destino_id = 'SWITCH'
      } else {
        await updateConta.mutateAsync({
          id: conta.id,
          valor_caixa: isCaixa ? pC - v : pC,
          valor_aplicado: !isCaixa ? pA - v : pA,
        })
        const dest = contasAll.find(c => c.id === transferenciaDestino)
        if (dest) {
           await updateConta.mutateAsync({
             id: dest.id,
             valor_caixa: (Number(dest.valorCaixa) || 0) + v,
           })
        }
        payload.transferencia_destino_id = transferenciaDestino
      }

      await createMov.mutateAsync(payload)
      setOpen(false)
      reset()
      return
    }

    // ENTRADA / SAIDA
    const isEntrada = tipo === 'ENTRADA'
    const pC = Number(conta.valorCaixa) || 0
    const pA = Number(conta.valorAplicado) || 0

    await updateConta.mutateAsync({
      id: conta.id,
      valor_caixa: isCaixa ? pC + (isEntrada ? v : -v) : pC,
      valor_aplicado: !isCaixa ? pA + (isEntrada ? v : -v) : pA,
    })

    await createMov.mutateAsync(payload)
    setOpen(false)
    reset()
  }

  /* ─── Excluir movimentação (estorno) ─── */
  async function handleDeleteMov(mov: MovimentacaoConta) {
    if (!conta) return

    if (mov.tipo === 'TRANSFERENCIA') {
      const isCaixa = mov.subconta === 'CAIXA'
      const destId = mov.transferenciaDestinoId
      const pC = Number(conta.valorCaixa) || 0
      const pA = Number(conta.valorAplicado) || 0

      if (destId === 'SWITCH' || !destId) {
            await updateConta.mutateAsync({
                id: conta.id,
                valor_caixa: isCaixa ? pC + mov.valor : pC - mov.valor,
                valor_aplicado: isCaixa ? pA - mov.valor : pA + mov.valor,
            })
      } else {
            await updateConta.mutateAsync({
                id: conta.id,
                valor_caixa: isCaixa ? pC + mov.valor : pC,
                valor_aplicado: !isCaixa ? pA + mov.valor : pA,
            })
            const dest = contasAll.find(c => c.id === destId)
            if (dest) {
                await updateConta.mutateAsync({
                    id: dest.id,
                    valor_caixa: (Number(dest.valorCaixa) || 0) - mov.valor,
                })
            }
      }
    } else {
      const isEntrada = mov.tipo === 'ENTRADA'
      const isCaixa = mov.subconta === 'CAIXA'
      const pC = Number(conta.valorCaixa) || 0
      const pA = Number(conta.valorAplicado) || 0

      await updateConta.mutateAsync({
        id: conta.id,
        valor_caixa: isCaixa ? pC + (isEntrada ? -mov.valor : mov.valor) : pC,
        valor_aplicado: !isCaixa ? pA + (isEntrada ? -mov.valor : mov.valor) : pA,
      })
    }

    await deleteMov.mutateAsync({ id: mov.id, contaId: conta.id })
  }

  /* ─── Not found ─── */
  if (!conta)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Landmark className="h-12 w-12 text-muted-foreground/20" />
        <p className="text-[17px] font-medium text-muted-foreground">Conta não encontrada</p>
        <Button variant="ghost" onClick={() => navigate({ to: '/financeiro' })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    )

  const subLabel = [
    conta.agencia ? `Ag. ${conta.agencia}` : '',
    conta.numeroConta ? `CC. ${conta.numeroConta}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ')
  const tipoCfg = TIPO_CFG[tipo]
  const TipoCfgIcon = tipoCfg.Icon

  /* ══════ RENDER ══════ */
  return (
    <div className="pb-24">
      {/* Back nav */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="px-4 md:px-6 pt-6 pb-2"
      >
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate({ to: '/financeiro' })}
          className="flex items-center gap-1 text-[17px] font-medium text-primary hover:opacity-70 transition-opacity min-h-[44px]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Contas</span>
        </motion.button>
      </motion.div>

      {/* Hero identity */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="px-4 md:px-6 pt-3 pb-6"
      >
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-[16px] flex-shrink-0"
            style={{ backgroundColor: accent.bg }}
          >
            <Landmark className="h-7 w-7" style={{ color: accent.fg }} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[26px] md:text-[32px] font-bold tracking-tight leading-none truncate">
              {conta.banco}
            </h1>
            {subLabel && (
              <p className="flex items-center gap-1.5 text-[14px] text-muted-foreground mt-1.5">
                <CreditCard className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                <span className="truncate">{subLabel}</span>
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="px-4 md:px-6"
      >
        <div className="rounded-2xl bg-card border p-5 md:p-6">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <Ring percent={caixaPct} color={accent.fg} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[17px] font-bold tabular-nums leading-none">{caixaPct}%</span>
                <span className="text-[8px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                  caixa
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
                Saldo Atual
              </p>
              <p className="text-[28px] md:text-[36px] font-bold tabular-nums tracking-tight leading-none">
                {formatCurrency(saldoAtual)}
              </p>
            </div>
          </div>
          <div className="flex gap-4 mt-5 pt-5 border-t border-border/10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-[6px] flex-shrink-0"
                  style={{ backgroundColor: '#34C75914' }}
                >
                  <Wallet className="h-[14px] w-[14px]" style={{ color: '#34C759' }} />
                </span>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Em caixa
                </p>
              </div>
              <p
                className="text-[18px] font-bold tabular-nums tracking-tight"
                style={{ color: '#34C759' }}
              >
                {formatCurrency(conta.valorCaixa)}
              </p>
            </div>
            <div className="w-px bg-border/20" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-[6px] flex-shrink-0"
                  style={{ backgroundColor: '#007AFF14' }}
                >
                  <FileText className="h-[14px] w-[14px]" style={{ color: '#007AFF' }} />
                </span>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Aplicações
                </p>
              </div>
              <p
                className="text-[18px] font-bold tabular-nums tracking-tight"
                style={{ color: '#007AFF' }}
              >
                {formatCurrency(conta.valorAplicado)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Movimentações */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
        className="px-4 md:px-6 mt-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Movimentações</h2>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              reset()
              setOpen(true)
            }}
            className="flex items-center gap-1.5 text-[15px] text-primary font-medium hover:opacity-70 transition-opacity min-h-[44px] px-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </motion.button>
        </div>

        <AnimatePresence mode="popLayout">
          {movs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
                style={{ backgroundColor: '#8E8E9314' }}
              >
                <Receipt className="h-7 w-7 text-muted-foreground/40" />
              </span>
              <p className="text-[17px] font-semibold">Sem movimentações</p>
              <p className="text-[14px] text-muted-foreground mt-1.5 text-center max-w-[200px]">
                Registre entradas, saídas e transferências
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  reset()
                  setOpen(true)
                }}
                className="mt-6 flex items-center gap-1.5 px-5 py-3 rounded-xl text-[15px] font-medium text-white"
                style={{ backgroundColor: accent.fg }}
              >
                <Plus className="h-4 w-4" />
                Adicionar Movimentação
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="list" className="space-y-6">
              {grouped.map((group, gi) => (
                <motion.div
                  key={group.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: gi * 0.06 }}
                >
                  <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                    {group.label}
                  </p>
                  <div className="rounded-[24px] bg-card/60 backdrop-blur-md border border-border/40 shadow-sm overflow-hidden mb-6">
                    <AnimatePresence initial={false}>
                      {group.items.map((mov, i) => {
                        const isT = mov.tipo === 'TRANSFERENCIA'
                        const isE = mov.tipo === 'ENTRADA'
                        const tint = isT ? '#007AFF' : isE ? '#34C759' : '#FF3B30'
                        const typeLbl = isT ? 'Transferência' : isE ? 'Entrada' : 'Saída'
                        const MovIcon = isT ? ArrowLeftRight : isE ? ArrowDownRight : ArrowUpRight
                        const sc = mov.subconta ?? 'CAIXA'
                        const scLbl = SUBCONTA_LABEL[sc]

                        const subInfo = isT
                          ? (() => {
                              if (
                                mov.transferenciaDestinoId === 'SWITCH' ||
                                !mov.transferenciaDestinoId
                              ) {
                                return `${scLbl} → ${sc === 'CAIXA' ? 'Aplicações' : 'Em Caixa'}`
                              }
                              const dest = contasAll.find(
                                (c) => c.id === mov.transferenciaDestinoId,
                              )
                              return `→ ${dest?.banco ?? 'Outra conta'}`
                            })()
                          : scLbl

                        return (
                          <motion.div
                            key={mov.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                            className={cn(
                              'flex items-center gap-3.5 md:gap-4 px-4 md:px-5 py-4 group overflow-hidden transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015]',
                              i > 0 && 'border-t border-border/30',
                            )}
                          >
                            <span
                              className="flex h-11 w-11 items-center justify-center rounded-[14px] flex-shrink-0"
                              style={{ backgroundColor: `${tint}14` }}
                            >
                              <MovIcon className="h-5 w-5" style={{ color: tint }} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[16px] md:text-[17px] font-semibold tracking-tight leading-snug break-words">
                                {mov.motivo}
                              </p>
                              <p className="text-[13px] font-medium text-muted-foreground mt-0.5 opacity-80">
                                {typeLbl}
                                {subInfo && (
                                  <>
                                    <span className="mx-1.5 text-border/50">·</span>
                                    {subInfo}
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                              <div className="text-right">
                                <p
                                  className="text-[17px] font-bold tracking-tight tabular-nums"
                                  style={{ color: isT ? '#007AFF' : isE ? '#34C759' : undefined }}
                                >
                                  {!isT && (isE ? '+' : '−')}
                                  {formatCurrency(mov.valor)}
                                </p>
                                <p className="text-[12px] font-medium text-muted-foreground tabular-nums opacity-60 mt-0.5">
                                  {formatDateTime(mov.createdAt)}
                                </p>
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => handleDeleteMov(mov)}
                                className="flex h-8 w-8 items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                                style={{ backgroundColor: '#FF3B3012' }}
                              >
                                <Trash2 className="h-4 w-4" style={{ color: '#FF3B30' }} />
                              </motion.button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ══════════════════════════════════
                MODAL — NOVA MOVIMENTAÇÃO  (iOS sheet)
            ══════════════════════════════════ */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) reset()
        }}
      >
        <DialogContent className="p-0 gap-0 border-0 dark:border dark:border-white/[0.07] sm:max-w-[420px] sm:rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col overflow-y-hidden">
          {/* ── Cabeçalho fixo: ícone animado + título + X ── */}
          <div className="flex-shrink-0 relative flex items-center px-5 pt-5 pb-4 gap-3.5">
            <AnimatePresence mode="wait">
              <motion.span
                key={tipo}
                initial={{ scale: 0.65, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.65, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.35, duration: 0.3 }}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] flex-shrink-0"
                style={{ backgroundColor: tipoCfg.iconBg }}
              >
                <TipoCfgIcon className="h-[22px] w-[22px]" style={{ color: tipoCfg.color }} />
              </motion.span>
            </AnimatePresence>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[17px] font-semibold tracking-tight leading-none">
                Nova Movimentação
              </DialogTitle>
              <p className="text-[13px] text-foreground/45 mt-1 truncate">{conta.banco}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.86 }}
              onClick={() => { setOpen(false); reset() }}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors flex-shrink-0"
            >
              <X className="h-[14px] w-[14px] text-foreground/60" />
            </motion.button>
          </div>

          {/* ── Form — área rolável ── */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-[10px] pb-3">

            {/* 1 — Tipo: Entrada | Saída | Transferência */}
            <div className="rounded-[14px] overflow-hidden bg-white dark:bg-white/[0.07]">
              <div className="px-3 py-[10px]">
                <div className="flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
                  {(['ENTRADA', 'SAIDA', 'TRANSFERENCIA'] as TipoMov[]).map((t) => {
                    const cfg = TIPO_CFG[t]
                    const active = tipo === t
                    const CfgIcon = cfg.Icon
                    return (
                      <motion.button
                        key={t}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTipo(t)}
                        className={cn(
                          'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[13px] font-medium transition-colors z-10',
                          active ? '' : 'text-foreground/40',
                        )}
                        style={{ color: active ? cfg.color : undefined }}
                      >
                        {active && (
                          <motion.div
                            layoutId="tipo-pill-ios"
                            className="absolute inset-0 bg-white dark:bg-white/[0.14] rounded-[8px] shadow-sm -z-10"
                            transition={{ type: 'spring', bounce: 0.15, duration: 0.36 }}
                          />
                        )}
                        <CfgIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{cfg.label}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 2 — Subconta / Destino de transferência */}
            <AnimatePresence mode="wait">
              {tipo !== 'TRANSFERENCIA' ? (
                <motion.div
                  key="subconta-normal"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="rounded-[14px] overflow-hidden bg-white dark:bg-white/[0.07]"
                >
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">
                      {tipo === 'ENTRADA' ? 'Destino' : 'Origem'}
                    </p>
                  </div>
                  <div className="px-3 pb-[10px]">
                    <div className="flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSubconta('CAIXA')}
                        className={cn(
                          'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[14px] font-medium transition-colors z-10',
                          subconta !== 'CAIXA' && 'text-foreground/40',
                        )}
                        style={{ color: subconta === 'CAIXA' ? '#34C759' : undefined }}
                      >
                        {subconta === 'CAIXA' && (
                          <motion.div
                            layoutId="sc-ios"
                            className="absolute inset-0 bg-white dark:bg-white/[0.14] rounded-[8px] shadow-sm -z-10"
                            transition={{ type: 'spring', bounce: 0.18, duration: 0.36 }}
                          />
                        )}
                        <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Em Caixa</span>
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSubconta('APLICADO')}
                        className={cn(
                          'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[14px] font-medium transition-colors z-10',
                          subconta !== 'APLICADO' && 'text-foreground/40',
                        )}
                        style={{ color: subconta === 'APLICADO' ? '#007AFF' : undefined }}
                      >
                        {subconta === 'APLICADO' && (
                          <motion.div
                            layoutId="sc-ios"
                            className="absolute inset-0 bg-white dark:bg-white/[0.14] rounded-[8px] shadow-sm -z-10"
                            transition={{ type: 'spring', bounce: 0.18, duration: 0.36 }}
                          />
                        )}
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Aplicações</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="transf-ios"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-[10px]"
                >
                  {/* De */}
                  <div className="rounded-[14px] overflow-hidden bg-white dark:bg-white/[0.07]">
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">De</p>
                    </div>
                    <div className="px-3 pb-3 space-y-1.5">
                      <DestinoCard
                        selected={subconta === 'CAIXA'}
                        onSelect={() => setSubconta('CAIXA')}
                        icon={Wallet}
                        color="#34C759"
                        iconBg="#34C75914"
                        title="Em Caixa"
                        subtitle={`Disponível · ${formatCurrency(Number(conta.valorCaixa) || 0)}`}
                      />
                      <DestinoCard
                        selected={subconta === 'APLICADO'}
                        onSelect={() => setSubconta('APLICADO')}
                        icon={FileText}
                        color="#007AFF"
                        iconBg="#007AFF14"
                        title="Aplicações"
                        subtitle={`Disponível · ${formatCurrency(Number(conta.valorAplicado) || 0)}`}
                      />
                    </div>
                  </div>
                  {/* Para */}
                  <div className="rounded-[14px] overflow-hidden bg-white dark:bg-white/[0.07]">
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">Para</p>
                    </div>
                    <div className="px-3 pb-3 space-y-1.5">
                      <DestinoCard
                        selected={transferenciaDestino === 'SWITCH'}
                        onSelect={() => setTransferenciaDestino('SWITCH')}
                        icon={subconta === 'CAIXA' ? FileText : Wallet}
                        color={subconta === 'CAIXA' ? '#007AFF' : '#34C759'}
                        iconBg={subconta === 'CAIXA' ? '#007AFF14' : '#34C75914'}
                        title={subconta === 'CAIXA' ? 'Aplicações' : 'Em Caixa'}
                        subtitle={`Saldo atual · ${formatCurrency(
                          subconta === 'CAIXA'
                            ? Number(conta.valorAplicado) || 0
                            : Number(conta.valorCaixa) || 0,
                        )}`}
                      />
                      {outrasContas.map((c) => (
                        <DestinoCard
                          key={c.id}
                          selected={transferenciaDestino === c.id}
                          onSelect={() => setTransferenciaDestino(c.id)}
                          icon={Landmark}
                          color="#AF52DE"
                          iconBg="#AF52DE14"
                          title={c.banco}
                          subtitle={`Em Caixa · ${formatCurrency(Number(c.valorCaixa) || 0)}`}
                        />
                      ))}
                      {outrasContas.length === 0 && (
                        <p className="text-[12px] text-foreground/40 text-center py-2">
                          Cadastre outras contas para transferir entre elas
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3 — Valor + Descrição num único grupo */}
            <div className="rounded-[14px] overflow-hidden bg-white dark:bg-white/[0.07]">
              {/* Valor */}
              <div className="flex items-center min-h-[52px] px-4 gap-3">
                <span className="text-[16px] font-medium flex-shrink-0 text-foreground/55">
                  Valor
                </span>
                <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                  <span
                    className="text-[14px] flex-shrink-0 font-semibold"
                    style={{ color: `${tipoCfg.color}80` }}
                  >
                    R$
                  </span>
                  <input
                    value={valor}
                    onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="text-[18px] text-right bg-transparent outline-none tabular-nums font-bold min-w-0 w-[140px] placeholder:text-black/20 dark:placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="h-px mx-4 bg-black/[0.07] dark:bg-white/[0.07]" />

              {/* Descrição */}
              <div className="flex items-center min-h-[52px] px-4 gap-3">
                <span className="text-[16px] font-medium flex-shrink-0 text-foreground/55">
                  Descrição
                </span>
                <input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={
                    tipo === 'ENTRADA'
                      ? 'Depósito, Receita…'
                      : tipo === 'SAIDA'
                        ? 'Pagamento, Despesa…'
                        : 'Reserva, Aplicação…'
                  }
                  className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 placeholder:text-black/20 dark:placeholder:text-white/20"
                />
              </div>
            </div>
          </div>

          {/* ── CTA fixo no rodapé ── */}
          <div className="flex-shrink-0 px-4 pt-3 pb-8 sm:pb-6 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-t border-black/[0.05] dark:border-white/[0.05]">
            <motion.button
              whileTap={{ scale: motivo.trim() && parseCurrency(valor) ? 0.97 : 1 }}
              disabled={!motivo.trim() || !parseCurrency(valor)}
              onClick={handleAdd}
              className={cn(
                'w-full flex items-center justify-center h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all',
                motivo.trim() && parseCurrency(valor)
                  ? 'text-white'
                  : 'bg-black/[0.07] dark:bg-white/[0.07] text-foreground/25 cursor-not-allowed',
              )}
              style={
                motivo.trim() && parseCurrency(valor)
                  ? { backgroundColor: tipoCfg.color }
                  : undefined
              }
            >
              {tipoCfg.btnLabel}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
