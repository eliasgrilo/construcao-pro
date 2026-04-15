import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { useToast } from '@/components/ui/toast'
import { useBodyScrollLock, useOverlayPresence } from '@/hooks/use-body-scroll-lock'
import {
  type Tarefa,
  type useCreateTarefa,
  useDeleteTarefa,
  useUpdateTarefa,
} from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
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
import { type RefObject, memo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type ClrColors, type NavigateFn, clr, greeting, obraColors } from '../dashboard-shared'
import { DashboardFilterMenuItem } from '../dashboard-widgets'
import {
  DashboardChecklistContextDropdown,
  DashboardChecklistDoneList,
  DashboardChecklistEmptyState,
  DashboardChecklistPendingList,
  DashboardChecklistProgressBar,
} from './lists'

export interface TaskGroup {
  groupKey: string
  groupLabel: string
  obraId: string | null
  items: Tarefa[]
}

export function DashboardChecklistModal({
  checklistOpen,
  setChecklistOpen,
  setNewTaskText,
  setContextDropOpen,
  pendingCount,
  doneCount,
  contextObra,
  contextDropOpen,
  activeObras,
  defaultObraId,
  setDefaultObraId,
  inputRef,
  newTaskText,
  addTask,
  createTarefa,
  tasks,
  toggleTask,
  deleteTask,
  editId,
  setEditId,
  editText,
  setEditText,
  editInputRef,
  startEdit,
  commitEdit,
}: {
  checklistOpen: boolean
  setChecklistOpen: (v: boolean) => void
  setNewTaskText: (v: string) => void
  setContextDropOpen: (v: boolean | ((v: boolean) => boolean)) => void
  pendingCount: number
  doneCount: number
  contextObra: { id: string; nome: string } | null
  contextDropOpen: boolean
  activeObras: Array<{ id: string; nome: string; status: string }>
  defaultObraId: string
  setDefaultObraId: (id: string) => void
  inputRef: RefObject<HTMLInputElement>
  newTaskText: string
  addTask: () => void
  createTarefa: ReturnType<typeof useCreateTarefa>
  tasks: Tarefa[]
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  editId: string | null
  setEditId: (id: string | null) => void
  editText: string
  setEditText: (text: string) => void
  editInputRef: RefObject<HTMLInputElement>
  startEdit: (t: Tarefa) => void
  commitEdit: () => void
}) {
  useBodyScrollLock(checklistOpen)
  useOverlayPresence(checklistOpen)

  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  return createPortal(
    <AnimatePresence>
      {checklistOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            style={{ zIndex: 1000 }}
            onClick={() => {
              setChecklistOpen(false)
              setNewTaskText('')
              setContextDropOpen(false)
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-6"
            style={{ zIndex: 1001 }}
          >
            <div
              ref={formRef}
              role="dialog"
              aria-modal="true"
              aria-label="Checklist de tarefas"
              className="rounded-t-[28px] sm:rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] overflow-hidden flex flex-col mx-auto w-full max-w-[500px] pointer-events-auto"
              style={{ maxHeight: 'min(92%, calc(100dvh - 3rem))' }}
            >
              {/* Handle + Header */}
              <div className="flex-shrink-0 px-5 pb-0 pt-3">
                <div className="w-10 h-1 rounded-full bg-black/[0.15] dark:bg-white/[0.2] mx-auto mb-4" />
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight">Checklist</h2>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {pendingCount > 0
                        ? `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`
                        : 'Tudo concluído'}
                      {doneCount > 0 && ` · ${doneCount} concluída${doneCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.86 }}
                    onClick={() => {
                      setChecklistOpen(false)
                      setNewTaskText('')
                      setContextDropOpen(false)
                    }}
                    aria-label="Fechar checklist"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12]"
                  >
                    <X className="h-4 w-4 text-foreground/60" />
                  </motion.button>
                </div>

                <DashboardChecklistContextDropdown
                  contextObra={contextObra}
                  contextDropOpen={contextDropOpen}
                  setContextDropOpen={setContextDropOpen}
                  activeObras={activeObras}
                  defaultObraId={defaultObraId}
                  setDefaultObraId={setDefaultObraId}
                />
              </div>

              {/* Add Task Input — context obra auto-applies */}
              <div className="flex-shrink-0 px-4 pb-3">
                <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3.5">
                    <Plus className="h-4 w-4 flex-shrink-0" style={{ color: clr.blue }} />
                    <input
                      ref={inputRef}
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTask()
                        }
                      }}
                      placeholder="Nova tarefa…"
                      className="flex-1 text-[15px] outline-none bg-transparent placeholder:text-muted-foreground/50"
                    />
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={addTask}
                      disabled={!newTaskText.trim() || createTarefa.isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-all flex-shrink-0"
                      style={{
                        backgroundColor:
                          newTaskText.trim() && !createTarefa.isPending
                            ? clr.blue
                            : 'rgba(60,60,67,0.08)',
                        color: newTaskText.trim() && !createTarefa.isPending ? '#fff' : '#C7C7CC',
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </motion.button>
                  </div>
                  {/* Active context hint — always visible */}
                  <div className="flex items-center gap-1.5 px-4 pb-3" style={{ marginTop: -4 }}>
                    <Building2
                      className="h-3 w-3 flex-shrink-0"
                      style={{ color: contextObra ? clr.blue : '#C7C7CC' }}
                    />
                    <p
                      className="text-[12px]"
                      style={{ color: contextObra ? clr.blue : '#C7C7CC' }}
                    >
                      {contextObra ? contextObra.nome : 'Geral — sem obra'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-10 space-y-2">
                <DashboardChecklistEmptyState tasks={tasks} clr={clr} />

                {/* Pending — full text, inline edit on tap */}
                <DashboardChecklistPendingList
                  tasks={tasks}
                  clr={clr}
                  activeObras={activeObras}
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

                {/* Done — full text, no truncate */}
                <DashboardChecklistDoneList
                  tasks={tasks}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                />

                {/* Progress bar */}
                <DashboardChecklistProgressBar tasks={tasks} doneCount={doneCount} />
              </div>
              <KeyboardToolbar
                onNext={focusNext}
                onPrev={focusPrev}
                onDone={dismiss}
                hasPrev={canGoPrev}
                hasNext={canGoNext}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export const DashboardChecklistPendingTask = memo(function DashboardChecklistPendingTask({
  task,
  i,
  clr,
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
  task: Tarefa
  i: number
  clr: ClrColors
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
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5',
        i > 0 && 'border-t border-black/[0.05] dark:border-white/[0.05]',
      )}
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => toggleTask(task.id)}
        className="flex-shrink-0 mt-0.5"
      >
        <Circle className="h-[22px] w-[22px]" style={{ color: clr.blue }} />
      </motion.button>
      <div className="flex-1 min-w-0">
        {editId === task.id ? (
          <input
            ref={editInputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitEdit()
              }
              if (e.key === 'Escape') {
                setEditId(null)
                setEditText('')
              }
            }}
            className="w-full text-[15px] font-medium outline-none bg-transparent border-b-2 pb-0.5"
            style={{ borderColor: clr.blue }}
          />
        ) : (
          <button type="button" onClick={() => startEdit(task)} className="text-left w-full">
            <p className="text-[15px] font-medium leading-snug break-words text-left">
              {task.texto}
            </p>
          </button>
        )}
      </div>
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => deleteTask(task.id)}
        className="flex h-8 w-8 items-center justify-center rounded-full opacity-100 transition-opacity flex-shrink-0"
        style={{ backgroundColor: '#FF3B3012' }}
      >
        <Trash2 className="h-3.5 w-3.5" style={{ color: '#FF3B30' }} />
      </motion.button>
    </div>
  )
})
