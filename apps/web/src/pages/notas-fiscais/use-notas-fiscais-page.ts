import { usePermissions } from '@/hooks/use-permissions'
import {
  useAlmoxarifados,
  useCreateContaPagar,
  useDeleteNotaFiscalOrchestrated,
  useFinanceiroContas,
  useFornecedores,
  useMateriais,
  useNfeContasPagar,
  useNotaFiscalItens,
  useNotasFiscais,
  useRegisterFinanceiroMovement,
} from '@/hooks/use-supabase'
import { useState } from 'react'
import type { FilterId } from '../notas-fiscais-types'
import { useNotasFiscaisDeleteFlow } from './use-notas-fiscais-delete-flow'
import { useNotasFiscaisImportFlow } from './use-notas-fiscais-import-flow'
import { useNotasFiscaisListData } from './use-notas-fiscais-list-data'

export function useNotasFiscaisPage() {
  const { canManageNotasFiscais } = usePermissions()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')

  const { data: nfs = [], isLoading, isError: nfsError } = useNotasFiscais()
  const { data: materiais = [] } = useMateriais()
  const { data: almoxarifados = [] } = useAlmoxarifados()
  const { data: fornecedores = [] } = useFornecedores()
  const { data: contas = [] } = useFinanceiroContas()
  const registerFinanceiroMovement = useRegisterFinanceiroMovement()
  const createContaPagar = useCreateContaPagar()
  const deleteNF = useDeleteNotaFiscalOrchestrated()

  const importFlow = useNotasFiscaisImportFlow({
    fornecedores,
    materiais,
    almoxarifados,
    contas,
    registerFinanceiroMovement,
    createContaPagar,
  })

  const deleteFlow = useNotasFiscaisDeleteFlow({ deleteNF })

  const { data: selectedItens = [], isLoading: itensLoading } = useNotaFiscalItens(
    deleteFlow.selectedNF?.id ?? null,
  )
  const { data: nfeContasPagar = [] } = useNfeContasPagar(
    deleteFlow.selectedNF?.status === 'VINCULADA' ? deleteFlow.selectedNF.id : null,
  )

  const listData = useNotasFiscaisListData({
    nfs,
    activeFilter,
    searchQuery,
    matchStates: importFlow.matchStates,
  })

  return {
    activeFilter,
    almoxarifados,
    canManageNotasFiscais,
    contas,
    createContaPagar,
    deleteNF,
    fornecedores,
    isLoading,
    itensLoading,
    materiais,
    nfeContasPagar,
    nfs,
    nfsError,
    searchQuery,
    selectedItens,
    setActiveFilter,
    setSearchQuery,
    ...listData,
    ...importFlow,
    ...deleteFlow,
  }
}
