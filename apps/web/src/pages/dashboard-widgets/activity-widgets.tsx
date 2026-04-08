import { useToast } from '@/components/ui/toast'
import {
  type ObraManutencao,
  type ObraRow,
  type Tarefa,
  useConcluirManutencao,
  useCreateManutencaoItem,
  useUpdateManutencaoItem,
} from '@/hooks/use-supabase'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  MapPin,
  Package,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, memo, useMemo, useRef, useState } from 'react'
import {
  type ClrColors,
  type CustoPorObraRow,
  type EstoqueAlertaRow,
  type NavigateFn,
  cardItemVariants,
  cardListVariants,
  clr,
  greeting,
  obraColors,
} from '../dashboard-shared'
import {
  DashboardAlertaEstoqueItem,
  DashboardAtividadeRecenteItem,
  DashboardObraCard,
} from './obra-card'
export function DashboardInsights({
  setChecklistOpen,
  pendingCount,
  clr,
  onNavigateTerrenos,
  terrenosStandby,
  totalTerrenos,
}: {
  setChecklistOpen: (v: boolean) => void
  pendingCount: number
  clr: ClrColors
  onNavigateTerrenos: () => void
  terrenosStandby: Array<{
    id: string
    nome: string
    status: string
    valor_terreno?: number | null
  }>
  totalTerrenos: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="px-4 md:px-6 mt-6 grid grid-cols-2 gap-3 md:gap-4"
    >
      {/* Checklist card */}
      <motion.div
        className="rounded-2xl bg-card p-4 md:p-5 cursor-pointer"
        whileTap={{ scale: 0.97 }}
        onClick={() => setChecklistOpen(true)}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
          style={{ backgroundColor: pendingCount > 0 ? '#007AFF18' : '#34C75918' }}
        >
          <ClipboardList
            className="h-5 w-5"
            style={{ color: pendingCount > 0 ? clr.blue : '#34C759' }}
          />
        </span>
        <p className="text-[24px] md:text-[28px] font-bold tabular-nums leading-none">
          {pendingCount}
        </p>
        <p className="text-[13px] md:text-[15px] text-muted-foreground mt-1">
          {pendingCount === 1 ? 'Tarefa pendente' : 'Tarefas pendentes'}
        </p>
      </motion.div>

      {/* Terrenos em Standby */}
      <motion.div
        className="rounded-2xl bg-card p-4 md:p-5 cursor-pointer"
        whileTap={{ scale: 0.97 }}
        onClick={onNavigateTerrenos}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
          style={{ backgroundColor: '#AF52DE18' }}
        >
          <Landmark className="h-5 w-5" style={{ color: '#AF52DE' }} />
        </span>
        <p
          className="text-[18px] md:text-[20px] font-bold tabular-nums leading-none"
          style={{ color: terrenosStandby.length > 0 ? '#AF52DE' : undefined }}
        >
          {formatCurrency(totalTerrenos)}
        </p>
        <p className="text-[13px] md:text-[15px] text-muted-foreground mt-1">
          Terrenos em Standby
          {terrenosStandby.length > 0 && (
            <span
              className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 rounded-full text-[10px] font-semibold px-1"
              style={{ backgroundColor: '#AF52DE', color: '#fff' }}
            >
              {terrenosStandby.length}
            </span>
          )}
        </p>
      </motion.div>
    </motion.div>
  )
}

export function DashboardObrasAtivasList({
  obras,
  navigate,
}: {
  obras: CustoPorObraRow[]
  navigate: NavigateFn
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="mt-10 px-4 md:px-6"
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Obras Ativas</h2>
        <button
          type="button"
          onClick={() => navigate({ to: '/obras' })}
          aria-label="Ver todas as obras"
          className="text-[15px] md:text-[17px] text-primary font-regular flex items-center min-h-[44px] px-2 hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-lg"
        >
          Ver Todas
          <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
        </button>
      </div>

      {obras.length === 0 ? (
        <p className="text-[17px] text-muted-foreground text-center py-10">
          Nenhuma obra ativa no momento.
        </p>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={cardListVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {obras.map((obra, i) => (
            <DashboardObraCard key={obra.id} obra={obra} navigate={navigate} />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

export function DashboardAtividadeRecenteList({
  movs,
  navigate,
  tipos,
}: {
  movs: Record<string, unknown>[]
  navigate: NavigateFn
  tipos: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }>
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="px-4 md:px-6 mt-10"
    >
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] md:text-[22px] font-bold tracking-[-0.028em] leading-none">
            Atividade Recente
          </h2>
          {movs.length > 0 && (
            <p className="text-[13px] text-muted-foreground mt-1">
              {movs.length} movimentaç{movs.length === 1 ? 'ão' : 'ões'}
            </p>
          )}
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate({ to: '/movimentacoes' })}
          aria-label="Ver todas as movimentações"
          className="flex items-center gap-1 text-[13px] font-semibold h-9 px-3.5 rounded-[10px] transition-colors"
          style={{ color: '#007AFF', background: 'rgba(0,122,255,0.08)' }}
        >
          Ver todas
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </motion.button>
      </div>

      {/* ── Content ── */}
      {movs.length === 0 ? (
        <DashboardAtividadeRecenteEmpty />
      ) : (
        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="show"
          className="space-y-2.5"
        >
          {movs.map((mov) => (
            <DashboardAtividadeRecenteItem key={mov.id as string} mov={mov} tipos={tipos} />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

export function DashboardAtividadeRecenteEmpty() {
  return (
    <div
      className="rounded-2xl bg-card border border-border/25 flex flex-col items-center justify-center py-14 gap-3"
      style={{ transform: 'translateZ(0)' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: 'rgba(0,122,255,0.09)' }}
      >
        <ArrowLeftRight className="h-7 w-7" style={{ color: '#007AFF' }} />
      </div>
      <p className="text-[17px] font-semibold tracking-[-0.022em]">Sem movimentações</p>
      <p className="text-[13px] text-muted-foreground text-center max-w-[220px] leading-relaxed">
        As movimentações de materiais aparecerão aqui
      </p>
    </div>
  )
}

export function DashboardAlertasEstoqueListEmpty({ clr }: { clr: ClrColors }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 gap-2">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: '#34C75918' }}
      >
        <CheckCircle2 className="h-6 w-6" style={{ color: clr.green }} />
      </div>
      <p className="text-[15px] font-semibold mt-1">Todos os materiais em dia</p>
      <p className="text-[13px] text-muted-foreground text-center max-w-[220px]">
        Todos os estoques estão acima do mínimo requerido
      </p>
    </div>
  )
}

export function DashboardAlertasEstoqueListHeader({
  alertas,
  clr,
  estoqueExpanded,
}: {
  alertas: EstoqueAlertaRow[]
  clr: ClrColors
  estoqueExpanded: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-4 md:px-5 pt-4 pb-3',
        (alertas.length > 0 || estoqueExpanded) && 'border-b border-border/20',
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
        style={{ backgroundColor: alertas.length > 0 ? '#FF3B3018' : '#34C75918' }}
      >
        {alertas.length > 0 ? (
          <AlertTriangle className="h-4 w-4" style={{ color: clr.red }} />
        ) : (
          <CheckCircle2 className="h-4 w-4" style={{ color: clr.green }} />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold leading-none">
          {alertas.length > 0 ? 'Itens com Estoque Baixo' : 'Estoque em Dia'}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {alertas.length > 0
            ? `${alertas.length} ${alertas.length === 1 ? 'material abaixo do mínimo' : 'materiais abaixo do mínimo'}`
            : 'Nenhum item abaixo do estoque mínimo'}
        </p>
      </div>
      {alertas.length === 0 && (
        <motion.span
          animate={{ rotate: estoqueExpanded ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
        </motion.span>
      )}
    </div>
  )
}

export function DashboardAlertasEstoqueList({
  alertas,
  estoqueExpanded,
  setEstoqueExpanded,
  clr,
}: {
  alertas: EstoqueAlertaRow[]
  estoqueExpanded: boolean
  setEstoqueExpanded: Dispatch<SetStateAction<boolean>>
  clr: ClrColors
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="px-4 md:px-6 mt-10"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Alertas de Estoque</h2>
      </div>
      <div
        className="rounded-2xl bg-card overflow-hidden"
        style={{
          transform: 'translateZ(0)',
          cursor: alertas.length === 0 ? 'pointer' : 'default',
        }}
        onClick={alertas.length === 0 ? () => setEstoqueExpanded((v: boolean) => !v) : undefined}
        role={alertas.length === 0 ? 'button' : undefined}
        tabIndex={alertas.length === 0 ? 0 : undefined}
        onKeyDown={
          alertas.length === 0
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') setEstoqueExpanded((v: boolean) => !v)
              }
            : undefined
        }
        aria-expanded={alertas.length === 0 ? estoqueExpanded : undefined}
      >
        {/* Header */}
        <DashboardAlertasEstoqueListHeader
          alertas={alertas}
          clr={clr}
          estoqueExpanded={estoqueExpanded}
        />

        {/* Collapsible content */}
        <AnimatePresence initial={false}>
          {(alertas.length > 0 || estoqueExpanded) && (
            <motion.div
              key="estoque-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              {/* Empty state */}
              {alertas.length === 0 && <DashboardAlertasEstoqueListEmpty clr={clr} />}

              {/* Items list */}
              {alertas.map((alerta, i) => {
                return (
                  <DashboardAlertaEstoqueItem key={alerta.id} alerta={alerta} i={i} clr={clr} />
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
