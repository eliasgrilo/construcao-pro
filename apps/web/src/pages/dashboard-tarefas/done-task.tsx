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

export interface TaskGroup {
  groupKey: string
  groupLabel: string
  obraId: string | null
  items: Tarefa[]
}

export function DashboardChecklistDoneTask({
  task,
  i,
  toggleTask,
  deleteTask,
}: {
  task: Tarefa
  i: number
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 opacity-60',
        i > 0 && 'border-t border-black/[0.05] dark:border-white/[0.05]',
      )}
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => toggleTask(task.id)}
        className="flex-shrink-0 mt-0.5"
      >
        <CircleCheck className="h-[22px] w-[22px]" style={{ color: '#34C759' }} />
      </motion.button>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium leading-snug line-through text-muted-foreground break-words">
          {task.texto}
        </p>
        {task.obra_nome && (
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">{task.obra_nome}</p>
        )}
      </div>
      <AnimatePresence mode="wait">
        {confirmDelete ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            className="flex items-center gap-1 flex-shrink-0"
          >
            <button
              type="button"
              onClick={() => deleteTask(task.id)}
              className="flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-semibold text-white bg-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Excluir
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-muted text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="trash"
            whileTap={{ scale: 0.88 }}
            onClick={() => setConfirmDelete(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full opacity-100 transition-opacity flex-shrink-0"
            style={{ backgroundColor: '#FF3B3012' }}
          >
            <Trash2 className="h-3.5 w-3.5" style={{ color: '#FF3B30' }} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
