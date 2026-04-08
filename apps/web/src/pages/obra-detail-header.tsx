import { formatBRL, parseCurrency } from '@/components/ui/currency-input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { useToast } from '@/components/ui/toast'
import { type ObraManutencao, useCancelObraVenda, type useUpdateObra } from '@/hooks/use-supabase'
import { cn, formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'
import { useSearch } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  FileText,
  Landmark,
  MapPin,
  Pencil,
} from 'lucide-react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useState } from 'react'
import { StatusSwitcher, statusMap } from './obra-detail-status-switcher'
import type { Tab } from './obra-detail-types'

export { statusMap } from './obra-detail-status-switcher'

type ObraRow = Database['public']['Tables']['obras']['Row']
type ObraStatus = Database['public']['Tables']['obras']['Row']['status']
type ToastFn = ReturnType<typeof useToast>['toast']

interface ObraCustosSummary {
  orcamento: number
  percentual: number
  saldo: number
  total: number
  valorBurocracia: number
  valorConstrucao: number
  valorTerreno: number
}

type UpdateObraMutationLike = ReturnType<typeof useUpdateObra>

interface ObraDetailHeaderLayoutProps {
  budgetInput: string
  budgetRef: RefObject<HTMLInputElement>
  custos?: ObraCustosSummary | null
  editingBudget: boolean
  editingNome: boolean
  editingTerreno: boolean
  manutencaoAtiva: ObraManutencao | null | undefined
  navigate: (options: { to: string }) => unknown
  nomeInput: string
  nomeRef: RefObject<HTMLInputElement>
  obra: ObraRow | null | undefined
  obraId: string
  setActiveTab: Dispatch<SetStateAction<Tab>>
  setBudgetInput: Dispatch<SetStateAction<string>>
  setEditingBudget: Dispatch<SetStateAction<boolean>>
  setEditingNome: Dispatch<SetStateAction<boolean>>
  setEditingTerreno: Dispatch<SetStateAction<boolean>>
  setManutencaoDialogOpen: Dispatch<SetStateAction<boolean>>
  setNomeInput: Dispatch<SetStateAction<string>>
  setTerrenoInput: Dispatch<SetStateAction<string>>
  setVendaConta1Valor: Dispatch<SetStateAction<string>>
  setVendaContaId: Dispatch<SetStateAction<string>>
  setVendaDialog: Dispatch<SetStateAction<boolean>>
  setVendaFormaPagamento: Dispatch<SetStateAction<string>>
  setVendaInput: Dispatch<SetStateAction<string>>
  setVendaParcelas: Dispatch<SetStateAction<string>>
  setVendaSplitContaId: Dispatch<SetStateAction<string>>
  setVendaSplitEnabled: Dispatch<SetStateAction<boolean>>
  setVendaSplitValor: Dispatch<SetStateAction<string>>
  setVendaSubconta: Dispatch<SetStateAction<'CAIXA' | 'APLICADO' | 'APLICACAO'>>
  terrenoInput: string
  terrenoRef: RefObject<HTMLInputElement>
  toast: ToastFn
  updateOrcamento: UpdateObraMutationLike
  vendaInputRef: RefObject<HTMLInputElement>
}

export function ObraDetailHeaderLayout({
  navigate,
  editingNome,
  nomeRef,
  nomeInput,
  setNomeInput,
  setEditingNome,
  obra,
  obraId,
  updateOrcamento,
  toast,
  setVendaInput,
  setVendaContaId,
  setVendaSubconta,
  setVendaFormaPagamento,
  setVendaParcelas,
  setVendaSplitEnabled,
  setVendaSplitContaId,
  setVendaSplitValor,
  setVendaConta1Valor,
  setVendaDialog,
  vendaInputRef,
  setManutencaoDialogOpen,
  manutencaoAtiva,
  editingBudget,
  budgetRef,
  budgetInput,
  setBudgetInput,
  setEditingBudget,
  custos,
  setActiveTab,
  editingTerreno,
  setEditingTerreno,
  terrenoInput,
  setTerrenoInput,
  terrenoRef,
}: ObraDetailHeaderLayoutProps) {
  const routeSearch = useSearch({ from: '/obras/$obraId' })
  const cancelObraVenda = useCancelObraVenda()
  const [cancelVendaDialog, setCancelVendaDialog] = useState(false)
  const [pendingCancelStatus, setPendingCancelStatus] = useState<string>('ATIVA')
  const pct = custos?.percentual ?? 0
  const barGradient =
    pct > 90
      ? 'linear-gradient(90deg, #FF6B6B 0%, #FF3B30 100%)'
      : pct > 70
        ? 'linear-gradient(90deg, #FFB340 0%, #FF9500 100%)'
        : 'linear-gradient(90deg, #30D158 0%, #34C759 100%)'
  const barLabelColor = pct > 90 ? '#FF3B30' : pct > 70 ? '#FF9500' : '#34C759'

  const sV = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 320, damping: 28 },
    },
  }

  return (
    <motion.div
      className="px-4 md:px-8 pt-6 pb-0"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
      }}
    >
      {/* Back button */}
      <motion.div variants={sV}>
        <button
          type="button"
          onClick={() => navigate({ to: routeSearch.from === 'dashboard' ? '/' : '/obras' })}
          className="flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-primary/70 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {routeSearch.from === 'dashboard' ? 'Dashboard' : 'Obras'}
        </button>
      </motion.div>

      {/* Title row */}
      <motion.div variants={sV} className="flex items-center gap-3 flex-wrap">
        {editingNome ? (
          <input
            ref={nomeRef}
            value={nomeInput}
            onChange={(e) => setNomeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              else if (e.key === 'Escape') setEditingNome(false)
            }}
            onBlur={() => {
              const trimmed = nomeInput.trim()
              if (trimmed && trimmed !== obra?.nome) {
                updateOrcamento.mutate(
                  { id: obraId, nome: trimmed },
                  {
                    onSuccess: () => toast({ title: 'Nome atualizado' }),
                    onError: () => toast({ title: 'Erro ao atualizar nome', variant: 'error' }),
                  },
                )
              }
              setEditingNome(false)
            }}
            className="bg-transparent border-b-2 border-primary outline-none min-w-[200px]"
            style={{
              lineHeight: 1.1,
              fontSize: 'clamp(28px, 7vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
            }}
          />
        ) : (
          <button
            type="button"
            title="Clique para editar o nome"
            onClick={() => {
              setNomeInput(obra?.nome ?? '')
              setEditingNome(true)
              setTimeout(() => nomeRef.current?.select(), 30)
            }}
            className="group flex items-center gap-2 text-left"
          >
            <h1
              className="leading-tight"
              style={{
                fontSize: 'clamp(28px, 7vw, 36px)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              {obra?.nome ?? '—'}
            </h1>
            <Pencil
              className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
              aria-hidden
            />
          </button>
        )}
        {obra && (
          <StatusSwitcher
            currentStatus={obra.status}
            isUpdating={updateOrcamento.isPending}
            onStatusChange={(newStatus) => {
              if (obra?.status === 'MANUTENCAO' && newStatus !== 'MANUTENCAO') {
                const unresolvedCount = (manutencaoAtiva?.itens ?? []).filter(
                  (i: { resolvido: boolean }) => !i.resolvido,
                ).length
                if (unresolvedCount > 0) {
                  toast({
                    title: 'Não é possível alterar o status',
                    description: `Resolva os ${unresolvedCount} problema${unresolvedCount !== 1 ? 's' : ''} pendente${unresolvedCount !== 1 ? 's' : ''} antes de sair da manutenção.`,
                    variant: 'error',
                  })
                  return
                }
              }
              if (newStatus === 'VENDIDO') {
                setVendaInput('')
                setVendaContaId('')
                setVendaSubconta('CAIXA')
                setVendaFormaPagamento('')
                setVendaParcelas('')
                setVendaSplitEnabled(false)
                setVendaSplitContaId('')
                setVendaSplitValor('')
                setVendaConta1Valor('')
                setVendaDialog(true)
                setTimeout(() => vendaInputRef.current?.focus(), 150)
              } else if (obra?.status === 'VENDIDO') {
                // Leaving VENDIDO — requires reversing all financial records from the sale
                setPendingCancelStatus(newStatus)
                setCancelVendaDialog(true)
              } else if (newStatus === 'MANUTENCAO') {
                setManutencaoDialogOpen(true)
              } else {
                updateOrcamento.mutate(
                  { id: obraId, status: newStatus },
                  {
                    onSuccess: () =>
                      toast({ title: `Status alterado para ${statusMap[newStatus]?.label}` }),
                    onError: () => toast({ title: 'Erro ao alterar status', variant: 'error' }),
                  },
                )
              }
            }}
          />
        )}
      </motion.div>

      {/* Location */}
      {obra?.endereco && (
        <motion.div
          variants={sV}
          className="flex items-center gap-1.5 mt-2 text-[13px] text-muted-foreground/80"
        >
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span style={{ letterSpacing: '0.005em' }}>{obra.endereco}</span>
        </motion.div>
      )}

      {/* ── GASTO TOTAL hero ── */}
      <motion.div variants={sV} className="mt-8">
        <button
          type="button"
          title="Ver custos detalhados"
          onClick={() => setActiveTab('custos')}
          className="group text-left"
        >
          <p
            className="text-[10.5px] font-semibold uppercase text-muted-foreground/70 group-hover:text-muted-foreground transition-colors"
            style={{ letterSpacing: '0.1em' }}
          >
            Gasto Total
          </p>
          <p
            className="text-[42px] md:text-[50px] font-bold tabular-nums leading-none mt-1.5 group-hover:text-primary transition-colors"
            style={{ letterSpacing: '-0.022em', fontFeatureSettings: '"tnum"' }}
          >
            {formatCurrency(custos?.total ?? 0)}
          </p>
        </button>
      </motion.div>

      {/* ── Progress bar ── */}
      <motion.div variants={sV} className="mt-5">
        <div
          className="h-[7px] w-full rounded-full overflow-hidden"
          style={{ background: 'rgba(120,120,128,0.16)' }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.35 }}
            style={{ background: barGradient }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span
            className="text-[13px] font-semibold"
            style={{ color: barLabelColor, letterSpacing: '-0.01em' }}
          >
            {pct}% utilizado
          </span>
          <span className="text-[12px] text-muted-foreground">
            Orçamento:{' '}
            {editingBudget ? (
              <input
                ref={budgetRef}
                type="text"
                inputMode="decimal"
                className="text-[12px] font-semibold tabular-nums bg-transparent border-b border-primary outline-none w-28 text-right"
                value={budgetInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setBudgetInput(formatBRL(e.target.value))}
                onBlur={() => {
                  const val = parseCurrency(budgetInput)
                  if (val >= 0)
                    updateOrcamento.mutate(
                      { id: obraId, orcamento: val },
                      {
                        onSuccess: () => setEditingBudget(false),
                        onError: () => {
                          setEditingBudget(false)
                          toast({ title: 'Erro ao salvar orçamento', variant: 'error' })
                        },
                      },
                    )
                  else setEditingBudget(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseCurrency(budgetInput)
                    if (val >= 0)
                      updateOrcamento.mutate(
                        { id: obraId, orcamento: val },
                        {
                          onSuccess: () => setEditingBudget(false),
                          onError: () => {
                            setEditingBudget(false)
                            toast({ title: 'Erro ao salvar orçamento', variant: 'error' })
                          },
                        },
                      )
                  }
                  if (e.key === 'Escape') setEditingBudget(false)
                }}
              />
            ) : (
              <button
                type="button"
                title="Clique para editar orçamento"
                className="font-semibold tabular-nums text-foreground hover:text-primary transition-colors"
                onClick={() => {
                  setBudgetInput(
                    formatBRL(String(custos?.orcamento ?? obra?.orcamento ?? 0).replace('.', ',')),
                  )
                  setEditingBudget(true)
                  setTimeout(() => budgetRef.current?.focus(), 50)
                }}
              >
                {formatCurrency(custos?.orcamento ?? 0)}
              </button>
            )}
          </span>
        </div>
      </motion.div>

      {/* ── 3 category cards ── */}
      <motion.div variants={sV} className="mt-5 grid grid-cols-3 gap-2.5 md:gap-4">
        {(
          [
            {
              label: 'Terreno',
              Icon: Landmark,
              color: '#AF52DE',
              bg: 'rgba(175,82,222,0.13)',
              value: custos?.valorTerreno ?? 0,
              onClick: () => {
                if (editingTerreno) return
                setTerrenoInput(formatBRL(String(custos?.valorTerreno ?? 0).replace('.', ',')))
                setEditingTerreno(true)
                setTimeout(() => terrenoRef.current?.focus(), 50)
              },
            },
            {
              label: 'Burocracia',
              Icon: FileText,
              color: '#007AFF',
              bg: 'rgba(0,122,255,0.13)',
              value: custos?.valorBurocracia ?? 0,
              onClick: () => {
                setActiveTab('burocracia')
                try {
                  sessionStorage.setItem(`obra-tab-${obraId}`, 'burocracia')
                } catch {
                  // sessionStorage may be unavailable (private browsing / quota exceeded)
                }
              },
            },
            {
              label: 'Construção',
              Icon: Building2,
              color: '#FF9500',
              bg: 'rgba(255,149,0,0.13)',
              value: custos?.valorConstrucao ?? 0,
              onClick: () => {
                setActiveTab('almoxarifados')
                try {
                  sessionStorage.setItem(`obra-tab-${obraId}`, 'almoxarifados')
                } catch {
                  // sessionStorage may be unavailable (private browsing / quota exceeded)
                }
              },
            },
          ] as const
        ).map(({ label, Icon, color, bg, value, onClick }) => (
          <motion.button
            key={label}
            type="button"
            onClick={onClick}
            whileTap={{ scale: 0.955 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="flex flex-col items-center gap-2 rounded-[18px] border px-2 py-3.5 md:py-4 cursor-pointer hover:bg-accent/40 transition-colors"
            style={{
              background: 'rgba(120,120,128,0.06)',
              borderColor: 'rgba(120,120,128,0.14)',
            }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-[13px] flex-shrink-0"
              style={{ background: bg }}
            >
              <Icon className="h-[18px] w-[18px]" style={{ color }} />
            </span>
            <span
              className="text-[11px] text-muted-foreground/80 text-center leading-tight"
              style={{ letterSpacing: '0.005em' }}
            >
              {label}
            </span>
            {label === 'Terreno' && editingTerreno ? (
              <input
                ref={terrenoRef}
                type="text"
                inputMode="decimal"
                className="text-[12px] md:text-[13px] font-semibold tabular-nums text-center bg-transparent border-b border-[#AF52DE] outline-none w-full leading-tight"
                style={{
                  color: '#AF52DE',
                  letterSpacing: '-0.01em',
                  fontFeatureSettings: '"tnum"',
                }}
                value={terrenoInput}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setTerrenoInput(formatBRL(e.target.value))}
                onBlur={() => {
                  const val = parseCurrency(terrenoInput)
                  if (val >= 0)
                    updateOrcamento.mutate(
                      { id: obraId, valor_terreno: val },
                      {
                        onSuccess: () => setEditingTerreno(false),
                        onError: () => {
                          setEditingTerreno(false)
                          toast({ title: 'Erro ao salvar terreno', variant: 'error' })
                        },
                      },
                    )
                  else setEditingTerreno(false)
                }}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') {
                    const val = parseCurrency(terrenoInput)
                    if (val >= 0)
                      updateOrcamento.mutate(
                        { id: obraId, valor_terreno: val },
                        {
                          onSuccess: () => setEditingTerreno(false),
                          onError: () => {
                            setEditingTerreno(false)
                            toast({ title: 'Erro ao salvar terreno', variant: 'error' })
                          },
                        },
                      )
                    else setEditingTerreno(false)
                  }
                  if (e.key === 'Escape') setEditingTerreno(false)
                }}
              />
            ) : (
              <span
                className="text-[12px] md:text-[13px] font-semibold tabular-nums text-center leading-tight"
                style={{
                  color: value > 0 ? color : 'var(--color-foreground)',
                  letterSpacing: '-0.01em',
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {formatCurrency(value)}
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Saldo row ── */}
      <motion.div
        variants={sV}
        className="mt-4"
        style={{ borderTop: '0.5px solid rgba(120,120,128,0.22)' }}
      >
        <div
          className="flex items-center justify-between py-3.5"
          style={{ borderBottom: '0.5px solid rgba(120,120,128,0.22)' }}
        >
          <span
            className="text-[13px] text-muted-foreground/80"
            style={{ letterSpacing: '0.005em' }}
          >
            Saldo
          </span>
          <span
            className="text-[15px] font-semibold tabular-nums"
            style={{
              color: (custos?.saldo ?? 0) >= 0 ? '#34C759' : '#FF3B30',
              letterSpacing: '-0.015em',
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatCurrency(custos?.saldo ?? 0)}
          </span>
        </div>
      </motion.div>

      {/* ── Cancel Venda Confirmation Dialog ── */}
      <Dialog open={cancelVendaDialog} onOpenChange={setCancelVendaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#FF9F0A]" />
              Cancelar venda?
            </DialogTitle>
          </DialogHeader>
          <div className="py-1 space-y-2 text-[14px] text-muted-foreground">
            <p>
              Ao confirmar, <strong className="text-foreground">todas</strong> as movimentações
              financeiras e contas a receber criadas nesta venda serão removidas permanentemente.
            </p>
            <p>Esta ação não pode ser desfeita.</p>
          </div>
          <DialogFooter className="gap-2 flex-row justify-end">
            <DialogClose asChild>
              <button
                type="button"
                className="h-10 px-4 rounded-xl text-[14px] font-medium border border-input bg-background hover:bg-muted transition-colors"
              >
                Manter venda
              </button>
            </DialogClose>
            <button
              type="button"
              disabled={cancelObraVenda.isPending}
              className="h-10 px-4 rounded-xl text-[14px] font-medium bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90 transition-colors disabled:opacity-50"
              onClick={() => {
                cancelObraVenda.mutate(
                  { obra_id: obraId, new_status: pendingCancelStatus },
                  {
                    onSuccess: () => {
                      setCancelVendaDialog(false)
                      toast({
                        title: `Venda cancelada — status alterado para ${statusMap[pendingCancelStatus as keyof typeof statusMap]?.label ?? pendingCancelStatus}`,
                      })
                    },
                    onError: (err) => {
                      setCancelVendaDialog(false)
                      toast({
                        title: 'Erro ao cancelar venda',
                        description: err instanceof Error ? err.message : 'Tente novamente.',
                        variant: 'error',
                      })
                    },
                  },
                )
              }}
            >
              {cancelObraVenda.isPending ? 'Cancelando…' : 'Cancelar venda'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
