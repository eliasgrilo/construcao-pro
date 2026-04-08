import { useToast } from '@/components/ui/toast'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  type Tarefa,
  useCreateTarefa,
  useDeleteTarefa,
  useUpdateTarefa,
} from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  ClipboardList,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { type RefObject, memo, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type ClrColors, type NavigateFn, clr, greeting, obraColors } from '../dashboard-shared'
import { DashboardFilterMenuItem } from '../dashboard-widgets'
import { groupTasksByObra } from './state'

export interface TaskGroup {
  groupKey: string
  groupLabel: string
  obraId: string | null
  items: Tarefa[]
}

export function DashboardChecklistResumoPendingPreview({
  pendingCount,
  tasks,
  toggleTask,
  clr,
  activeObras,
}: {
  pendingCount: number
  tasks: Tarefa[]
  toggleTask: (id: string) => void
  clr: ClrColors
  activeObras: Array<{ id: string; nome: string; status: string }>
}) {
  const pending: Tarefa[] = tasks.filter((t) => !t.concluida)
  const groups = groupTasksByObra(pending)
  const PREVIEW_LIMIT = 4

  // Flatten for preview: show tasks from each group in order, up to PREVIEW_LIMIT
  const previewItems: {
    task: Tarefa
    isFirstInGroup: boolean
    groupLabel: string
    obraId: string | null
  }[] = []
  for (const group of groups) {
    for (let i = 0; i < group.items.length; i++) {
      previewItems.push({
        task: group.items[i],
        isFirstInGroup: i === 0,
        groupLabel: group.groupLabel,
        obraId: group.obraId,
      })
      if (previewItems.length >= PREVIEW_LIMIT) break
    }
    if (previewItems.length >= PREVIEW_LIMIT) break
  }

  return (
    <AnimatePresence initial={false}>
      {pendingCount > 0 && (
        <motion.div
          key="checklist-tasks"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden"
        >
          {previewItems.map(({ task, isFirstInGroup, groupLabel, obraId }, idx) => {
            let obraColor = clr.blue
            if (obraId) {
              const obraIndex = activeObras.findIndex((o) => o.id === obraId)
              if (obraIndex !== -1) {
                obraColor = obraColors[(obraIndex + 1) % obraColors.length]
              }
            }
            return (
              <div key={task.id}>
                {/* Group mini-header — shown only for first item in each group */}
                {isFirstInGroup && (
                  <div
                    className="flex items-center gap-1.5 px-4 md:px-5 pt-2.5 pb-1"
                    style={{ borderTop: idx > 0 ? '1px solid rgba(60,60,67,0.06)' : undefined }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: obraId ? obraColor : '#8E8E93' }}
                    />
                    <span
                      className="text-[10px] font-semibold tracking-widest uppercase truncate"
                      style={{ color: obraId ? obraColor : '#8E8E93' }}
                    >
                      {groupLabel}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    'flex items-center gap-3 px-4 md:px-5 py-2.5',
                    !isFirstInGroup && 'border-t border-border/[0.06]',
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTask(task.id)
                    }}
                    className="flex-shrink-0"
                    aria-label="Marcar como concluída"
                  >
                    <Circle className="h-[18px] w-[18px]" style={{ color: clr.blue }} />
                  </button>
                  <p className="text-[14px] font-medium leading-snug flex-1 min-w-0 truncate">
                    {task.texto}
                  </p>
                </div>
              </div>
            )
          })}
          {pendingCount > PREVIEW_LIMIT && (
            <div
              className="flex items-center justify-center py-2.5"
              style={{ borderTop: '1px solid rgba(60,60,67,0.06)' }}
            >
              <span className="text-[12px] font-medium" style={{ color: clr.blue }}>
                +{pendingCount - PREVIEW_LIMIT} mais
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function getChecklistSubtitle(
  pendingCount: number,
  doneCount: number,
  totalTasks: number,
): string {
  if (totalTasks === 0) return 'Toque para adicionar tarefas'

  if (pendingCount > 0) {
    const pendText = pendingCount === 1 ? 'tarefa pendente' : 'tarefas pendentes'
    if (doneCount > 0) {
      const doneText = doneCount === 1 ? 'concluída' : 'concluídas'
      return `${pendingCount} ${pendText} · ${doneCount} ${doneText}`
    }
    return `${pendingCount} ${pendText}`
  }

  const taskWord = doneCount === 1 ? 'tarefa' : 'tarefas'
  const doneWord = doneCount === 1 ? 'concluída' : 'concluídas'
  return `${doneCount} ${taskWord} ${doneWord}`
}

export function DashboardChecklistResumoHeader({
  pendingCount,
  doneCount,
  clr,
  tasks,
}: {
  pendingCount: number
  doneCount: number
  clr: ClrColors
  tasks: Tarefa[]
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-4 md:px-5 pt-4 pb-3',
        pendingCount > 0 && 'border-b border-border/20',
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
        style={{ backgroundColor: pendingCount > 0 ? '#007AFF18' : '#34C75918' }}
      >
        <ClipboardList
          className="h-4 w-4"
          style={{ color: pendingCount > 0 ? clr.blue : '#34C759' }}
        />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold leading-none">Checklist de Tarefas</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {getChecklistSubtitle(pendingCount, doneCount, tasks.length)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
    </div>
  )
}

export function DashboardChecklistResumo({
  setChecklistOpen,
  pendingCount,
  doneCount,
  clr,
  tasks,
  toggleTask,
  activeObras,
}: {
  setChecklistOpen: (v: boolean) => void
  pendingCount: number
  doneCount: number
  clr: ClrColors
  tasks: Tarefa[]
  toggleTask: (id: string) => void
  activeObras: Array<{ id: string; nome: string; status: string }>
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="px-4 md:px-6 mt-4"
    >
      <motion.button
        type="button"
        className="rounded-2xl bg-card overflow-hidden cursor-pointer w-full text-left"
        style={{ transform: 'translateZ(0)' }}
        onClick={() => setChecklistOpen(true)}
        whileTap={{ scale: 0.99 }}
        aria-label="Abrir checklist de tarefas"
      >
        <DashboardChecklistResumoHeader
          pendingCount={pendingCount}
          doneCount={doneCount}
          clr={clr}
          tasks={tasks}
        />

        <DashboardChecklistResumoPendingPreview
          pendingCount={pendingCount}
          tasks={tasks}
          toggleTask={toggleTask}
          clr={clr}
          activeObras={activeObras}
        />
      </motion.button>
    </motion.div>
  )
}
