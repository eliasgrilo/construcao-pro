import { useToast } from '@/components/ui/toast'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { usePermissions } from '@/hooks/use-permissions'
import {
  type FornecedorRow,
  type MaterialRow,
  type MovimentacaoRow,
  type ObraManutencao,
  type ObraManutencaoItem,
  type ObraRow,
  type Tarefa,
  useAllManutencaoAtiva,
  useConcluirManutencao,
  useCreateManutencaoItem,
  useCreateTarefa,
  useDashboardCustoPorObra,
  useDashboardStats,
  useDeleteTarefa,
  useEstoqueAlertas,
  useFinanceiroContas,
  useFornecedores,
  useMateriais,
  useMovimentacoes,
  useMovimentacoesRecentes,
  useObras,
  useTarefas,
  useUpdateManutencaoItem,
  useUpdateTarefa,
} from '@/hooks/use-supabase'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import {
  type DashAIBaseContext,
  DashAIChatPanel,
  type DashAIChatPanelProps,
  useDashboardAI,
} from './dashboard-ai'
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
} from './dashboard-shared'

import type { ObraFilterStatus } from '@/lib/obra-route-search'
import { useAuthStore } from '@/stores/auth-store'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  MapPin,
  Package,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import {
  DashboardChecklistContextDropdown,
  DashboardChecklistDoneList,
  DashboardChecklistEmptyState,
  DashboardChecklistGroupHeader,
  DashboardChecklistModal,
  DashboardChecklistPendingList,
  DashboardChecklistPendingTask,
  DashboardChecklistProgressBar,
  DashboardChecklistResumo,
  DashboardChecklistResumoHeader,
  DashboardChecklistResumoPendingPreview,
  TaskGroup,
  getChecklistSubtitle,
  groupTasksByObra,
  useDashboardTarefasState,
} from './dashboard-tarefas'
import {
  DashboardAlertaEstoqueItem,
  DashboardAlertasEstoqueList,
  DashboardAlertasEstoqueListEmpty,
  DashboardAlertasEstoqueListHeader,
  DashboardAtividadeRecenteEmpty,
  DashboardAtividadeRecenteItem,
  DashboardAtividadeRecenteList,
  DashboardFilterMenuItem,
  DashboardInsights,
  DashboardManutencaoWidget,
  DashboardObraCard,
  DashboardObrasAtivasList,
  DashboardOrcamento,
  DashboardSaldo,
  Ring,
  ringColor,
  statusBreakdown,
  statusMap,
  tipos,
} from './dashboard-widgets'

/* Re-export shared constants for backwards compatibility */
export { clr, obraColors, cardListVariants, cardItemVariants, greeting }
export type { ClrColors, NavigateFn, CustoPorObraRow, EstoqueAlertaRow }

/* Apple Fitness-quality SVG Ring — gradient stroke + subtle glow */
/* ═══════════════════════════════════════════════════════════════
   Checklist grouping — tasks grouped by obra (grupo classificado)
   ═══════════════════════════════════════════════════════════════ */

export function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: stats } = useDashboardStats()
  const { data: recentMovs } = useMovimentacoesRecentes()
  const { data: custoPorObra } = useDashboardCustoPorObra()
  const { data: alertasData } = useEstoqueAlertas()
  const { data: manutencaoAtiva = [] } = useAllManutencaoAtiva()

  const { data: obrasRaw } = useObras()
  const { allowedObraIds } = usePermissions()
  // Obra-level access: filter obras for restricted users
  const obrasData = useMemo(() => {
    if (!obrasRaw) return obrasRaw
    if (!allowedObraIds) return obrasRaw
    const allowed = new Set(allowedObraIds)
    return obrasRaw.filter((o) => allowed.has(o.id) && o.status !== 'FINALIZADA')
  }, [obrasRaw, allowedObraIds])
  const { data: contas = [], isLoading: contasLoading } = useFinanceiroContas()

  const s = stats
  const movs = recentMovs || []
  const alertas = (alertasData || []) as EstoqueAlertaRow[]
  const obras = (custoPorObra || []).filter((o) => o.status === 'ATIVA')
  const pct =
    s?.orcamentoTotal && s.orcamentoTotal > 0
      ? Math.round((s.custoTotal / s.orcamentoTotal) * 100)
      : 0

  /* ── Cloud Checklist — Supabase ── */
  const { data: tarefasData = [] } = useTarefas()
  const createTarefa = useCreateTarefa()
  const updateTarefa = useUpdateTarefa()
  const deleteTarefa = useDeleteTarefa()

  const tasks: Tarefa[] = tarefasData

  const CTX_KEY = 'construcao_pro_checklist_obra_ctx'
  const [defaultObraId, setDefaultObraIdState] = useState<string>(
    () => localStorage.getItem(CTX_KEY) ?? '',
  )
  const setDefaultObraId = useCallback((id: string) => {
    setDefaultObraIdState(id)
    if (id) localStorage.setItem(CTX_KEY, id)
    else localStorage.removeItem(CTX_KEY)
  }, [])
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [contextDropOpen, setContextDropOpen] = useState(false)
  const [estoqueExpanded, setEstoqueExpanded] = useState(false)

  const activeObras = (obrasData || []).filter(
    (o: { id: string; nome: string; status: string }) => o.status !== 'VENDIDO',
  )
  const contextObra =
    activeObras.find((o: { id: string; nome: string; status: string }) => o.id === defaultObraId) ??
    null

  const {
    newTaskText,
    setNewTaskText,
    editId,
    setEditId,
    editText,
    setEditText,
    inputRef,
    editInputRef,
    addTask,
    toggleTask,
    deleteTask,
    startEdit,
    commitEdit,
  } = useDashboardTarefasState(contextObra, createTarefa, updateTarefa, deleteTarefa, tasks, toast)

  /* Auto-focus input when checklist opens — Apple quality: keyboard appears immediately */

  useEffect(() => {
    if (!checklistOpen) return
    const timer = setTimeout(() => inputRef.current?.focus(), 380)
    return () => clearTimeout(timer)
  }, [checklistOpen])

  const pendingCount = tasks.filter((t) => !t.concluida).length
  const doneCount = tasks.filter((t) => t.concluida).length

  /* Saldo financeiro */
  const totalCaixa = contas.reduce((sum, c) => sum + (Number(c.valor_caixa) || 0), 0)
  const totalAplicado = contas.reduce((sum, c) => sum + (Number(c.valor_aplicado) || 0), 0)
  const totalDisponivel = totalCaixa + totalAplicado

  /* Terrenos em Standby */
  const terrenosStandby = (obrasData || []).filter((o) => o.status === 'TERRENO')
  const totalTerrenos = terrenosStandby.reduce(
    (sum: number, o: (typeof terrenosStandby)[0]) => sum + (o.valor_terreno ?? 0),
    0,
  )

  /* ── Dashboard AI Assistant ── */
  const dashAI = useDashboardAI({
    saldo: totalDisponivel,
    contas: contas.map((c) => ({
      banco: c.banco,
      valor_caixa: Number(c.valor_caixa) || 0,
      valor_aplicado: Number(c.valor_aplicado) || 0,
    })),
    totalObras: (obrasData || []).length,
    obrasAtivas: obras.length,
    custoTotal: s?.custoTotal ?? 0,
    orcamentoTotal: s?.orcamentoTotal ?? 0,
    alertasCount: alertas.length,
    pct,
    obras: custoPorObra || [],
    tarefas: tasks,
    manutencoes: manutencaoAtiva,
    alertas: alertas as Record<string, unknown>[],
    recentMovs: movs as Record<string, unknown>[],
  })

  return (
    <div className="pb-16">
      {/* ─── Large Title ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="px-4 md:px-6 pt-10 pb-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight leading-tight">
              {greeting()}, {user?.nome?.split(' ')[0] ?? 'usuário'}.
            </h1>
            <p className="text-[15px] md:text-[17px] text-muted-foreground mt-1">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>

          {/* AI Button */}
          <motion.button
            type="button"
            onClick={dashAI.openChat}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative flex items-center gap-2 rounded-2xl px-3.5 py-2 text-white overflow-hidden flex-shrink-0 self-start mt-1"
            style={{
              background: 'linear-gradient(135deg, #007AFF 0%, #34C759 100%)',
              boxShadow: '0 4px 18px rgba(0,122,255,0.30)',
            }}
          >
            <motion.div
              className="absolute inset-0 opacity-25"
              style={{
                background:
                  'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            />
            <Sparkles className="h-3.5 w-3.5 relative z-10" />
            <span className="text-[12px] font-semibold relative z-10 hidden sm:inline">
              Assistente IA
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* ─── Saldo Disponível ─── */}
      <DashboardSaldo
        totalDisponivel={totalDisponivel}
        contasLoading={contasLoading}
        totalCaixa={totalCaixa}
        totalAplicado={totalAplicado}
      />

      {/* ─── Manutenção Ativa ─── */}
      <DashboardManutencaoWidget manutencoes={manutencaoAtiva} navigate={navigate} />

      {/* ─── Orçamento Geral ─── */}
      <DashboardOrcamento
        pct={pct}
        s={s}
        obrasData={obrasData}
        onNavigateObrasByStatus={(status) =>
          navigate({
            to: '/obras',
            search: { tab: status as ObraFilterStatus, from: 'dashboard' },
          })
        }
      />

      {/* ─── Insights row ─── */}
      <DashboardInsights
        setChecklistOpen={setChecklistOpen}
        pendingCount={pendingCount}
        clr={clr}
        onNavigateTerrenos={() =>
          navigate({ to: '/obras', search: { tab: 'TERRENO', from: 'dashboard' } })
        }
        terrenosStandby={terrenosStandby}
        totalTerrenos={totalTerrenos}
      />

      {/* ─── Checklist de Tarefas ─── */}
      <DashboardChecklistResumo
        setChecklistOpen={setChecklistOpen}
        pendingCount={pendingCount}
        doneCount={doneCount}
        clr={clr}
        tasks={tasks}
        toggleTask={toggleTask}
        activeObras={activeObras}
      />

      {/* ─── Suas Obras ─── */}
      <DashboardObrasAtivasList obras={obras} navigate={navigate} />

      {/* ─── Atividade Recente ─── */}
      <DashboardAtividadeRecenteList movs={movs} navigate={navigate} tipos={tipos} />

      {/* ─── Alertas de Estoque ─── */}
      <DashboardAlertasEstoqueList
        alertas={alertas}
        estoqueExpanded={estoqueExpanded}
        setEstoqueExpanded={setEstoqueExpanded}
        clr={clr}
      />

      {/* ═══════ CHECKLIST MODAL (Apple iOS Sheet) ═══════ */}
      <DashboardChecklistModal
        checklistOpen={checklistOpen}
        setChecklistOpen={setChecklistOpen}
        setNewTaskText={setNewTaskText}
        setContextDropOpen={setContextDropOpen}
        pendingCount={pendingCount}
        doneCount={doneCount}
        contextObra={contextObra}
        contextDropOpen={contextDropOpen}
        activeObras={activeObras}
        defaultObraId={defaultObraId}
        setDefaultObraId={setDefaultObraId}
        inputRef={inputRef}
        newTaskText={newTaskText}
        addTask={addTask}
        createTarefa={createTarefa}
        tasks={tasks}
        toggleTask={toggleTask}
        deleteTask={deleteTask}
        editId={editId}
        setEditId={setEditId}
        editText={editText}
        setEditText={setEditText}
        editInputRef={editInputRef}
        startEdit={startEdit}
        commitEdit={commitEdit}
      />

      {/* ═══════ AI ASSISTANT PANEL ═══════ */}
      <DashAIChatPanel
        open={dashAI.open}
        closeChat={dashAI.closeChat}
        messages={dashAI.messages}
        input={dashAI.input}
        setInput={dashAI.setInput}
        isProcessing={dashAI.isProcessing}
        handleUserMessage={dashAI.handleUserMessage}
        messagesEndRef={dashAI.messagesEndRef}
        suggestions={dashAI.suggestions}
      />
    </div>
  )
}

// memo: rendered in a .map() loop — prevents re-renders of ALL items when
// parent state changes (e.g., checklist text input, estoque expand toggle).
// memo: same rationale — rendered in a .map() loop, each item is expensive
// (has a mini progress bar and badge calculation). No need to re-render all
// alerts when an unrelated state (AI chat open, checklist) changes.
// memo: checklist tasks re-render every time the user types a new character in
// the 'add task' input (newTaskText state change). Without memo, the entire
// pending list re-renders on every keystroke. With memo, only the items whose
// props changed (e.g., the one being edited) re-render.
