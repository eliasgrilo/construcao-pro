import type { useToast } from '@/components/ui/toast'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import type {
  Tarefa,
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

export function useDashboardTarefasState(
  contextObra: { id: string; nome: string } | null,
  createTarefa: ReturnType<typeof useCreateTarefa>,
  updateTarefa: ReturnType<typeof useUpdateTarefa>,
  deleteTarefa: ReturnType<typeof useDeleteTarefa>,
  tasks: Tarefa[],
  toast: ReturnType<typeof useToast>['toast'],
) {
  const [newTaskText, setNewTaskText] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const addTask = useCallback(async () => {
    const texto = newTaskText.trim()
    if (!texto) return
    setNewTaskText('')
    setTimeout(() => inputRef.current?.focus(), 50)
    try {
      await createTarefa.mutateAsync({
        texto,
        obra_id: contextObra?.id ?? null,
        obra_nome: contextObra?.nome ?? null,
      })
    } catch {
      setNewTaskText(texto)
      toast({ title: 'Erro ao salvar tarefa', variant: 'error' })
    }
  }, [newTaskText, contextObra, createTarefa, toast])

  const toggleTask = useCallback(
    async (id: string) => {
      const t = tasks.find((x) => x.id === id)
      if (!t) return
      try {
        await updateTarefa.mutateAsync({ id, concluida: !t.concluida })
      } catch {
        toast({ title: 'Erro ao atualizar tarefa', variant: 'error' })
      }
    },
    [tasks, updateTarefa, toast],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await deleteTarefa.mutateAsync(id)
      } catch {
        toast({ title: 'Erro ao excluir tarefa', variant: 'error' })
      }
    },
    [deleteTarefa, toast],
  )

  const startEdit = useCallback((t: Tarefa) => {
    setEditId(t.id)
    setEditText(t.texto)
    setTimeout(() => editInputRef.current?.select(), 50)
  }, [])

  const commitEdit = useCallback(async () => {
    const texto = editText.trim()
    if (editId && texto) {
      try {
        await updateTarefa.mutateAsync({ id: editId, texto })
      } catch {
        toast({ title: 'Erro ao editar tarefa', variant: 'error' })
      }
    }
    setEditId(null)
    setEditText('')
  }, [editId, editText, updateTarefa, toast])

  return {
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
  }
}

export function groupTasksByObra(tasks: Tarefa[]): TaskGroup[] {
  const map = new Map<string, TaskGroup>()
  for (const task of tasks) {
    const key = task.obra_id ?? '__geral__'
    if (!map.has(key)) {
      map.set(key, {
        groupKey: key,
        groupLabel: task.obra_nome ?? 'Geral',
        obraId: task.obra_id,
        items: [],
      })
    }
    // biome-ignore lint/style/noNonNullAssertion: key was just set above if not present
    map.get(key)!.items.push(task)
  }
  // Obras first (sorted by name), then Geral last
  return Array.from(map.values()).sort((a, b) => {
    if (!a.obraId && b.obraId) return 1
    if (a.obraId && !b.obraId) return -1
    return a.groupLabel.localeCompare(b.groupLabel, 'pt-BR')
  })
}
