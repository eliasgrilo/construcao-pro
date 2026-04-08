/**
 * obra-detail-manutencao-active.tsx
 * ProgressRing + ItemRow + ManutencaoActiveCard extracted from obra-detail-manutencao-ui.tsx
 */
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import {
  type ObraManutencao,
  type ObraManutencaoItem,
  useDeleteManutencaoItem,
  useUpdateManutencaoItem,
} from '@/hooks/use-supabase'
import { cn, relativeTime } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { type RefObject, useRef, useState } from 'react'

// ─── ProgressRing ────────────────────────────────────────────────────────────

function ProgressRing({ resolved, total }: { resolved: number; total: number }) {
  const pct = total === 0 ? 0 : resolved / total
  const size = 52
  const r = 20
  const circumference = 2 * Math.PI * r
  const dash = pct * circumference
  const allDone = pct === 1 && total > 0

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform transition-transform duration-500 ease-in-out"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <title>Progresso de tempo de manutenção</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={allDone ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)'}
          strokeWidth="3"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={allDone ? '#34C759' : '#FF9500'}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[12px] font-bold leading-none tabular-nums"
          style={{ color: allDone ? '#34C759' : '#FF9500' }}
        >
          {resolved}
        </span>
        <span className="text-[9px] leading-none mt-0.5 text-muted-foreground/50">/{total}</span>
      </div>
    </div>
  )
}

// ─── ItemRow ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: ObraManutencaoItem
  obraId: string
}

function ItemRow({ item }: ItemRowProps) {
  const { toast } = useToast()
  const { canManageObras } = usePermissions()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.descricao)
  const [showDelete, setShowDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateItem = useUpdateManutencaoItem()
  const deleteItem = useDeleteManutencaoItem()

  function startEdit() {
    setEditText(item.descricao)
    setEditing(true)
    setShowDelete(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function saveEdit() {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === item.descricao) {
      setEditing(false)
      return
    }
    try {
      await updateItem.mutateAsync({ id: item.id, descricao: trimmed })
      setEditing(false)
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'error' })
    }
  }

  async function toggleResolved() {
    if (editing) return
    try {
      await updateItem.mutateAsync({ id: item.id, resolvido: !item.resolvido })
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'error' })
    }
  }

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync(item.id)
    } catch {
      toast({ title: 'Erro ao remover', variant: 'error' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border',
        item.resolvido
          ? 'bg-[rgba(52,199,89,0.06)] border-[rgba(52,199,89,0.15)]'
          : 'bg-[rgba(255,149,0,0.04)] border-[rgba(255,149,0,0.15)] dark:bg-card dark:border-border',
      )}
    >
      {/* Orange left accent strip */}
      {!item.resolvido && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl bg-[#FF9500]" />
      )}

      <div className="flex min-h-[52px] items-center gap-3 pl-4 pr-2">
        {/* Animated checkbox */}
        <motion.button
          type="button"
          onClick={toggleResolved}
          disabled={updateItem.isPending}
          whileTap={{ scale: 0.82 }}
          className="flex-shrink-0"
          aria-label={item.resolvido ? 'Marcar como pendente' : 'Marcar como resolvido'}
        >
          <div
            className={cn(
              'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
              item.resolvido
                ? 'bg-[#34C759] border-[#34C759]'
                : 'bg-transparent border-[rgba(255,149,0,0.45)]',
            )}
          >
            <AnimatePresence>
              {item.resolvido && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <Check size={12} strokeWidth={3} className="text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2 py-1.5">
              <Input
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="h-8 text-[14px] flex-1 text-foreground bg-background"
                disabled={updateItem.isPending}
              />
              <button
                type="button"
                onClick={saveEdit}
                disabled={updateItem.isPending}
                className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#34C759] text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                <Check size={13} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-muted text-muted-foreground"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <span
              className={cn(
                'block text-[15px] leading-snug',
                item.resolvido
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground font-medium',
              )}
            >
              {item.descricao}
            </span>
          )}
        </div>

        {/* Always-visible action buttons — mobile-friendly */}
        {!editing && canManageObras && (
          <div className="flex-shrink-0 flex items-center gap-0.5">
            <AnimatePresence mode="wait">
              {showDelete ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteItem.isPending}
                    className="flex items-center gap-1 h-8 px-2.5 rounded-xl text-[12px] font-semibold text-white bg-destructive disabled:opacity-50"
                  >
                    <Trash2 size={11} />
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDelete(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-muted text-muted-foreground"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-0.5"
                >
                  <button
                    type="button"
                    onClick={startEdit}
                    className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground/50 transition-colors active:bg-muted hover:text-muted-foreground"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground/50 transition-colors active:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── ManutencaoActiveCard ─────────────────────────────────────────────────────

export function ManutencaoActiveCard({
  obraId,
  manutencaoAtiva,
  totalItens,
  resolvidosCount,
  itens,
  showAddInput,
  newProblem,
  setNewProblem,
  handleAddProblem,
  addInputRef,
  openAddInput,
  setShowAddInput,
  createItemPending,
  hasUnresolved,
  allResolved,
  handleConcluir,
  concluirPending,
}: {
  obraId: string
  manutencaoAtiva: ObraManutencao
  totalItens: number
  resolvidosCount: number
  itens: ObraManutencaoItem[]
  showAddInput: boolean
  newProblem: string
  setNewProblem: (v: string) => void
  handleAddProblem: () => void
  addInputRef: RefObject<HTMLInputElement>
  openAddInput: () => void
  setShowAddInput: (v: boolean) => void
  createItemPending: boolean
  hasUnresolved: boolean
  allResolved: boolean
  handleConcluir: () => void
  concluirPending: boolean
}) {
  const { canManageObras } = usePermissions()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="overflow-hidden rounded-3xl"
      style={{
        background: 'linear-gradient(145deg, rgba(255,149,0,0.08) 0%, rgba(255,149,0,0.03) 100%)',
        border: '1.5px solid rgba(255,149,0,0.2)',
        boxShadow: '0 2px 20px rgba(255,149,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,149,0,0.15)' }}
          >
            <Wrench size={20} style={{ color: '#FF9500' }} />
          </div>
          <div>
            <p className="text-[16px] font-bold text-foreground tracking-tight">Manutenção Ativa</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
              <Clock size={11} />
              Iniciada {relativeTime(manutencaoAtiva.data_inicio)}
            </p>
          </div>
        </div>
        {totalItens > 0 && <ProgressRing resolved={resolvidosCount} total={totalItens} />}
      </div>

      <div className="mx-4 h-px bg-[rgba(255,149,0,0.12)]" />

      <div className="px-4 pt-3 pb-2">
        {totalItens === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[14px] text-muted-foreground/60">
              Nenhum problema registrado ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {itens.map((item: ObraManutencaoItem) => (
                <ItemRow key={item.id} item={item} obraId={obraId} />
              ))}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {showAddInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="mt-3 rounded-2xl overflow-hidden border-2 transition-all duration-200 focus-within:border-[rgba(255,149,0,0.5)] bg-card"
                style={{ borderColor: 'rgba(255,149,0,0.25)' }}
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <Input
                    ref={addInputRef}
                    placeholder="Descreva o problema…"
                    value={newProblem}
                    onChange={(e) => setNewProblem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddProblem()
                      if (e.key === 'Escape') {
                        setShowAddInput(false)
                        setNewProblem('')
                      }
                    }}
                    disabled={createItemPending}
                    className="flex-1 h-auto border-0 bg-transparent text-[15px] shadow-none focus-visible:ring-0 px-0 py-0"
                  />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      onClick={handleAddProblem}
                      loading={createItemPending}
                      disabled={!newProblem.trim()}
                      className="h-9 px-4 rounded-xl text-[13px] font-semibold text-white flex-shrink-0"
                      style={{ background: newProblem.trim() ? '#FF9500' : undefined }}
                    >
                      Adicionar
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddInput(false)
                        setNewProblem('')
                      }}
                      className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl text-muted-foreground/60 hover:bg-muted transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[rgba(255,149,0,0.10)]">
        {!showAddInput && canManageObras ? (
          <button
            type="button"
            onClick={openAddInput}
            className="flex items-center gap-1.5 h-9 rounded-xl px-3 text-[14px] font-medium transition-colors active:bg-[rgba(255,149,0,0.10)]"
            style={{ color: '#FF9500' }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Problema
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {hasUnresolved && (
            <span
              className="flex items-center gap-1 text-[12px]"
              style={{ color: 'rgba(255,149,0,0.75)' }}
            >
              <AlertTriangle size={12} />
              {totalItens - resolvidosCount} pendente
              {totalItens - resolvidosCount !== 1 ? 's' : ''}
            </span>
          )}

          <AnimatePresence mode="wait">
            {allResolved && canManageObras ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button
                  onClick={handleConcluir}
                  loading={concluirPending}
                  className="h-8 rounded-xl px-3 text-[13px] font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #34C759 0%, #28A745 100%)',
                    boxShadow: '0 2px 10px rgba(52,199,89,0.3)',
                  }}
                >
                  <Check size={13} strokeWidth={2.5} className="mr-1" />
                  Confirmar
                </Button>
              </motion.div>
            ) : (
              <motion.button
                key="conclude"
                type="button"
                disabled
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-1.5 h-8 rounded-xl px-3 text-[13px] font-semibold cursor-not-allowed"
                style={{ background: 'rgba(120,120,128,0.15)', color: 'rgba(120,120,128,0.6)' }}
              >
                <CheckCircle2 size={14} strokeWidth={2} />
                Concluir
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
