import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import {
  type ObraManutencao,
  type ObraManutencaoItem,
  useConcluirManutencao,
  useCreateManutencaoItem,
  useDeleteManutencaoItem,
  useUpdateManutencaoItem,
} from '@/hooks/use-supabase'
import { cn, formatDateShort, relativeTime } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HistoricoCard,
  ManutencaoActiveCard,
  ManutencaoEmptyState,
} from './obra-detail-manutencao-ui'

export interface ObraDetailManutencaoTabProps {
  obraId: string
  manutencaoAtiva: ObraManutencao | null
  manutencaoLoading: boolean
  historico: ObraManutencao[]
  historicoLoading: boolean
  onIniciarManutencao: () => void
  autoOpenAddInput?: boolean
  onAutoOpenDone?: () => void
}

export function ObraDetailManutencaoTab({
  obraId,
  manutencaoAtiva,
  manutencaoLoading,
  historico,
  historicoLoading,
  onIniciarManutencao,
  autoOpenAddInput,
  onAutoOpenDone,
}: ObraDetailManutencaoTabProps) {
  const { toast } = useToast()

  const [showAddInput, setShowAddInput] = useState(false)
  const [newProblem, setNewProblem] = useState('')
  const [historicoExpanded, setHistoricoExpanded] = useState(true)
  const addInputRef = useRef<HTMLInputElement>(null)

  const createItem = useCreateManutencaoItem()
  const concluir = useConcluirManutencao()

  const itens = manutencaoAtiva?.itens ?? []
  const totalItens = itens.length
  const resolvidosCount = itens.filter((i) => i.resolvido).length
  const allResolved = totalItens === 0 || resolvidosCount === totalItens
  const hasUnresolved = totalItens > 0 && resolvidosCount < totalItens

  const historicoSessoes = historico.filter((s) => s.status === 'concluido')

  const openAddInput = useCallback(() => {
    setShowAddInput(true)
    setTimeout(() => addInputRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    if (autoOpenAddInput && manutencaoAtiva && !manutencaoLoading) {
      openAddInput()
      onAutoOpenDone?.()
    }
  }, [autoOpenAddInput, manutencaoAtiva, manutencaoLoading, onAutoOpenDone, openAddInput])

  async function handleAddProblem() {
    const trimmed = newProblem.trim()
    if (!trimmed || !manutencaoAtiva) return
    try {
      await createItem.mutateAsync({
        manutencao_id: manutencaoAtiva.id,
        obra_id: obraId,
        descricao: trimmed,
      })
      setNewProblem('')
      setTimeout(() => addInputRef.current?.focus(), 0)
    } catch {
      toast({ title: 'Erro ao adicionar problema', variant: 'error' })
    }
  }

  async function handleConcluir() {
    if (!manutencaoAtiva) return
    try {
      await concluir.mutateAsync({ id: manutencaoAtiva.id, obra_id: obraId })
      toast({ title: 'Manutenção concluída!', variant: 'success' })
    } catch {
      toast({ title: 'Erro ao concluir manutenção', variant: 'error' })
    }
  }

  if (manutencaoLoading) {
    return (
      <div className="space-y-3 p-1">
        {[1, 2, 3].map((k) => (
          <div key={k} className="h-16 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ══ Active / Empty ══════════════════════════════════════════════════ */}
      {!manutencaoAtiva ? (
        <ManutencaoEmptyState onIniciarManutencao={onIniciarManutencao} />
      ) : (
        <ManutencaoActiveCard
          obraId={obraId}
          manutencaoAtiva={manutencaoAtiva}
          totalItens={totalItens}
          resolvidosCount={resolvidosCount}
          itens={itens}
          showAddInput={showAddInput}
          newProblem={newProblem}
          setNewProblem={setNewProblem}
          handleAddProblem={handleAddProblem}
          addInputRef={addInputRef}
          openAddInput={openAddInput}
          setShowAddInput={setShowAddInput}
          createItemPending={createItem.isPending}
          hasUnresolved={hasUnresolved}
          allResolved={allResolved}
          handleConcluir={handleConcluir}
          concluirPending={concluir.isPending}
        />
      )}

      {/* ══ Histórico ═══════════════════════════════════════════════════════ */}
      {(historicoLoading || historicoSessoes.length > 0) && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setHistoricoExpanded((v) => !v)}
            className="flex w-full items-center justify-between py-1"
          >
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Histórico
            </span>
            <motion.div
              animate={{ rotate: historicoExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} className="text-muted-foreground/40" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {historicoExpanded && (
              <motion.div
                key="historico"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                {historicoLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((k) => (
                      <div key={k} className="h-14 animate-pulse rounded-2xl bg-muted" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historicoSessoes.map((sessao) => (
                      <HistoricoCard key={sessao.id} sessao={sessao} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!historicoLoading && historicoSessoes.length === 0 && manutencaoAtiva && (
        <p className="text-center text-[12px] text-muted-foreground/40">
          Nenhuma manutenção concluída ainda.
        </p>
      )}
    </div>
  )
}
