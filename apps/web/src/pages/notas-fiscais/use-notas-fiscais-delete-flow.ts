import { useToast } from '@/components/ui/toast'
import type { useDeleteNotaFiscalOrchestrated } from '@/hooks/use-supabase'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import type { NFRow } from '../notas-fiscais-types'

type DeleteNFMutation = ReturnType<typeof useDeleteNotaFiscalOrchestrated>

type Params = {
  deleteNF: DeleteNFMutation
}

export function useNotasFiscaisDeleteFlow({ deleteNF }: Params) {
  const { toast } = useToast()
  const [selectedNF, setSelectedNF] = useState<NFRow | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<NFRow | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteFinanceiroWarning, setShowDeleteFinanceiroWarning] = useState(false)
  const [linkedContasPagar, setLinkedContasPagar] = useState<
    Array<{ id: string; valor_total: number }>
  >([])

  const handleDeleteRequest = async (nf: NFRow) => {
    setDeleteTarget(nf)
    try {
      const { data: linked, error: linkErr } = await supabase
        .from('contas_pagar')
        .select('id, valor_total')
        .eq('nf_id', nf.id)
      if (linkErr) throw linkErr
      const linkedList = (linked || []) as Array<{ id: string; valor_total: number }>
      if (linkedList.length > 0) {
        setLinkedContasPagar(linkedList)
        setShowDeleteFinanceiroWarning(true)
      } else {
        setShowDeleteConfirm(true)
      }
    } catch {
      setShowDeleteConfirm(true)
    }
  }

  const handleDelete = async (cancelFinanceiro?: boolean) => {
    if (!deleteTarget) return

    try {
      await deleteNF.mutateAsync({
        id: deleteTarget.id,
        cancelFinanceiro,
      })
      toast({ title: 'NF-e removida', variant: 'success' })
      setDeleteTarget(null)
      setShowDeleteConfirm(false)
      setShowDeleteFinanceiroWarning(false)
      setLinkedContasPagar([])
      if (selectedNF?.id === deleteTarget.id) {
        setSelectedNF(null)
        setShowDetail(false)
      }
    } catch (e) {
      setDeleteTarget(null)
      setShowDeleteConfirm(false)
      setShowDeleteFinanceiroWarning(false)
      setLinkedContasPagar([])
      toast({
        title: 'Erro ao remover NF-e',
        description: e instanceof Error ? e.message : '',
        variant: 'error',
      })
    }
  }

  return {
    deleteTarget,
    handleDelete,
    handleDeleteRequest,
    linkedContasPagar,
    selectedNF,
    setDeleteTarget,
    setLinkedContasPagar,
    setSelectedNF,
    setShowDeleteConfirm,
    setShowDeleteFinanceiroWarning,
    setShowDetail,
    showDeleteConfirm,
    showDeleteFinanceiroWarning,
    showDetail,
  }
}
