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
import { DashboardChecklistDoneTask } from './done-task'
import { DashboardChecklistPendingTask } from './modal'
import { groupTasksByObra } from './state'

export interface TaskGroup {
  groupKey: string
  groupLabel: string
  obraId: string | null
  items: Tarefa[]
}

export function DashboardChecklistContextDropdown({
  contextObra,
  contextDropOpen,
  setContextDropOpen,
  activeObras,
  defaultObraId,
  setDefaultObraId,
}: {
  contextObra: { id: string; nome: string } | null
  contextDropOpen: boolean
  setContextDropOpen: (v: boolean | ((v: boolean) => boolean)) => void
  activeObras: Array<{ id: string; nome: string; status: string }>
  defaultObraId: string
  setDefaultObraId: (id: string) => void
}) {
  // Get the color for the currently selected obra
  let obraColor = obraColors[0]
  if (contextObra?.id) {
    const obraIndex = activeObras.findIndex((o) => o.id === contextObra.id)
    if (obraIndex !== -1) {
      obraColor = obraColors[(obraIndex + 1) % obraColors.length]
    }
  }

  return (
    <div className="relative flex-shrink-0 px-4 pb-3">
      <p
        className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1"
        style={{ color: '#8E8E93' }}
      >
        Obra para nova tarefa
      </p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => setContextDropOpen((v) => !v)}
        className="flex items-center justify-between w-full rounded-2xl bg-white dark:bg-[#2C2C2E] px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
            style={{ backgroundColor: contextObra ? `${obraColor}14` : 'rgba(60,60,67,0.07)' }}
          >
            <Building2
              className="h-3.5 w-3.5"
              style={{ color: contextObra ? obraColor : '#8E8E93' }}
            />
          </span>
          <p
            className="text-[14px] font-medium"
            style={{ color: contextObra ? obraColor : undefined }}
          >
            {contextObra ? contextObra.nome : 'Sem obra (Geral)'}
          </p>
        </div>
        <motion.span
          animate={{ rotate: contextDropOpen ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {contextDropOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[calc(100%+8px)] left-4 right-4 z-10 rounded-2xl bg-white dark:bg-[#2C2C2E] shadow-lg overflow-hidden"
          >
            {/* Option: No obra (Geral) */}
            <DashboardFilterMenuItem
              obra={{ id: '', nome: 'Sem obra (Geral)' }}
              i={0}
              defaultObraId={defaultObraId}
              setDefaultObraId={setDefaultObraId}
              setContextDropOpen={setContextDropOpen}
            />
            {/* Options: Active obras */}
            {activeObras.map((obra, i) => (
              <DashboardFilterMenuItem
                key={obra.id}
                obra={obra}
                i={i + 1}
                defaultObraId={defaultObraId}
                setDefaultObraId={setDefaultObraId}
                setContextDropOpen={setContextDropOpen}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DashboardChecklistGroupHeader({
  group,
  clr,
  activeObras,
}: {
  group: TaskGroup
  clr: { blue: string; green: string; red: string; orange: string }
  activeObras: Array<{ id: string; nome: string; status: string }>
}) {
  const pendingInGroup = group.items.filter((t) => !t.concluida).length

  let obraColor = clr.blue
  if (group.obraId) {
    const obraIndex = activeObras.findIndex((o) => o.id === group.obraId)
    if (obraIndex !== -1) {
      obraColor = obraColors[(obraIndex + 1) % obraColors.length]
    }
  }

  return (
    <div className="flex items-center gap-2 px-1 mb-1.5 mt-1">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
        style={{ backgroundColor: group.obraId ? `${obraColor}14` : 'rgba(60,60,67,0.07)' }}
      >
        {group.obraId ? (
          <Building2 className="h-3 w-3" style={{ color: obraColor }} />
        ) : (
          <ClipboardList className="h-3 w-3" style={{ color: '#8E8E93' }} />
        )}
      </span>
      <span
        className="text-[11px] font-semibold tracking-widest uppercase flex-1 truncate"
        style={{ color: group.obraId ? obraColor : '#8E8E93' }}
      >
        {group.groupLabel}
      </span>
      {pendingInGroup > 0 && (
        <span
          className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: group.obraId ? `${obraColor}14` : 'rgba(60,60,67,0.07)',
            color: group.obraId ? obraColor : '#8E8E93',
          }}
        >
          {pendingInGroup}
        </span>
      )}
    </div>
  )
}

export function DashboardChecklistPendingList({
  tasks,
  clr,
  activeObras,
  toggleTask,
  deleteTask,
  editId,
  editInputRef,
  editText,
  setEditText,
  commitEdit,
  setEditId,
  startEdit,
}: {
  tasks: Tarefa[]
  clr: ClrColors
  activeObras: Array<{ id: string; nome: string; status: string }>
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  editId: string | null
  editInputRef: RefObject<HTMLInputElement>
  editText: string
  setEditText: (text: string) => void
  commitEdit: () => void
  setEditId: (id: string | null) => void
  startEdit: (t: Tarefa) => void
}) {
  const pending: Tarefa[] = tasks.filter((t) => !t.concluida)
  if (pending.length === 0) return null
  const groups = groupTasksByObra(pending)
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.groupKey}>
          <DashboardChecklistGroupHeader group={group} clr={clr} activeObras={activeObras} />
          <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden">
            {group.items.map((task, i) => (
              <DashboardChecklistPendingTask
                key={task.id}
                task={task}
                i={i}
                clr={clr}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                editId={editId}
                editInputRef={editInputRef}
                editText={editText}
                setEditText={setEditText}
                commitEdit={commitEdit}
                setEditId={setEditId}
                startEdit={startEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardChecklistDoneList({
  tasks,
  toggleTask,
  deleteTask,
}: {
  tasks: Tarefa[]
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
}) {
  const done = tasks.filter((t) => t.concluida)
  if (done.length === 0) return null
  return (
    <>
      <p className="text-[11px] font-semibold tracking-wide px-1 pt-2" style={{ color: '#8E8E93' }}>
        CONCLUÍDAS
      </p>
      <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden">
        {done.map((task, i) => (
          <DashboardChecklistDoneTask
            key={task.id}
            task={task}
            i={i}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
          />
        ))}
      </div>
    </>
  )
}

export function DashboardChecklistEmptyState({ tasks, clr }: { tasks: Tarefa[]; clr: ClrColors }) {
  if (tasks.length > 0) return null
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: '#007AFF14' }}
      >
        <ClipboardList className="h-7 w-7" style={{ color: clr.blue }} />
      </div>
      <p className="text-[17px] font-semibold">Checklist vazio</p>
      <p className="text-[14px] text-muted-foreground text-center max-w-[220px] leading-relaxed">
        Adicione tarefas acima e acompanhe o progresso das suas obras
      </p>
    </div>
  )
}

export function DashboardChecklistProgressBar({
  tasks,
  doneCount,
}: { tasks: Tarefa[]; doneCount: number }) {
  const allTasks: Tarefa[] = tasks
  if (allTasks.length === 0) return null
  const pct = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0
  const allDone = doneCount === allTasks.length && allTasks.length > 0
  const groups = groupTasksByObra(allTasks)
  const multipleGroups = groups.length > 1

  return (
    <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] px-4 py-3.5 mt-2 space-y-3">
      {/* Overall progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[11px] font-semibold tracking-widest uppercase"
            style={{ color: '#8E8E93' }}
          >
            Progresso geral
          </span>
          <span
            className="text-[12px] font-bold tabular-nums"
            style={{ color: allDone ? '#34C759' : '#007AFF' }}
          >
            {pct}%
          </span>
        </div>
        <div
          className="h-[6px] rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(60,60,67,0.08)' }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ backgroundColor: allDone ? '#34C759' : '#007AFF' }}
          />
        </div>
        {allDone && (
          <p
            className="text-[12px] font-medium mt-1.5 flex items-center gap-1"
            style={{ color: '#34C759' }}
          >
            <CheckCircle2 className="h-3 w-3" /> Todas as tarefas concluídas!
          </p>
        )}
      </div>

      {/* Per-group progress bars (only when 2+ groups) */}
      {multipleGroups && (
        <div className="space-y-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.05]">
          {groups.map((group) => {
            const groupDone = group.items.filter((t) => t.concluida).length
            const groupPct =
              group.items.length > 0 ? Math.round((groupDone / group.items.length) * 100) : 0
            const groupAllDone = groupDone === group.items.length
            return (
              <div key={group.groupKey}>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[11px] font-medium truncate flex-1 mr-2"
                    style={{ color: group.obraId ? '#007AFF' : '#8E8E93' }}
                  >
                    {group.groupLabel}
                  </span>
                  <span
                    className="text-[10px] tabular-nums flex-shrink-0"
                    style={{ color: groupAllDone ? '#34C759' : '#8E8E93' }}
                  >
                    {groupDone}/{group.items.length}
                  </span>
                </div>
                <div
                  className="h-[3px] rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgba(60,60,67,0.08)' }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${groupPct}%` }}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{
                      backgroundColor: groupAllDone
                        ? '#34C759'
                        : group.obraId
                          ? '#007AFF'
                          : '#8E8E93',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
