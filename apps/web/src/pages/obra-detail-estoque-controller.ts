import { formatBRL } from '@/components/ui/currency-input'
import { useToast } from '@/components/ui/toast'
import {
  type AlmoxarifadoRow,
  type FinanceiroConta,
  type FornecedorRow,
  type MaterialRow,
  useCreateEntradaEstoqueFinanceiro,
  useCreateMovimentacaoEntrada,
  useCreateMovimentacaoSaida,
  useCreateMovimentacaoTransferencia,
} from '@/hooks/use-supabase'
import { formatNumber, todayISO } from '@/lib/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type EntradaDialogField,
  type TransferDialogField,
  createEntradaDialogState,
  createTransferDialogState,
  parseCurrency,
  parseDecimalInput,
} from './obra-detail-estoque-utils'
import type { DeleteEstoqueTarget, EstoqueItem } from './obra-detail-types'

interface UseObraDetailEstoqueControllerArgs {
  estoque: EstoqueItem[]
  materiais: MaterialRow[]
  almoxarifados: AlmoxarifadoRow[]
  contasFinanceiras: FinanceiroConta[]
  fornecedores: FornecedorRow[]
}

export function useObraDetailEstoqueController({
  estoque,
  materiais,
  almoxarifados,
  contasFinanceiras,
  fornecedores,
}: UseObraDetailEstoqueControllerArgs) {
  const { toast } = useToast()
  const createEntrada = useCreateMovimentacaoEntrada()
  const createEntradaFinanceiro = useCreateEntradaEstoqueFinanceiro()
  const createTransferencia = useCreateMovimentacaoTransferencia()
  const createSaida = useCreateMovimentacaoSaida()

  const [entrada, setEntrada] = useState(createEntradaDialogState)
  const [transfer, setTransfer] = useState(createTransferDialogState)
  const [deleteEstoqueTarget, setDeleteEstoqueTarget] = useState<DeleteEstoqueTarget | null>(null)
  const autofilledEntradaMaterialIdRef = useRef<string | null>(null)

  const selectedEntMaterial = useMemo(
    () => materiais.find((material) => material.id === entrada.materialId),
    [materiais, entrada.materialId],
  )

  useEffect(() => {
    const material = selectedEntMaterial
    if (!material) {
      autofilledEntradaMaterialIdRef.current = null
      return
    }

    const selectedMaterialId = material?.id ?? null
    if (autofilledEntradaMaterialIdRef.current === selectedMaterialId) return

    const raw = material.preco_unitario ?? 0
    autofilledEntradaMaterialIdRef.current = selectedMaterialId
    setEntrada((current) => ({
      ...current,
      preco: raw > 0 ? formatBRL(String(raw).replace('.', ',')) : '',
      unidade: material.unidade ?? material.categoria?.unidade ?? 'UN',
    }))
  }, [selectedEntMaterial])

  const entQtyNumber = Number(entrada.qty.replace(',', '.'))
  const entPrecoNumber = parseCurrency(entrada.preco)
  const entradaTotal =
    entQtyNumber > 0
      ? entQtyNumber * (entPrecoNumber || selectedEntMaterial?.preco_unitario || 0)
      : 0
  const needsFinanceiro = entradaTotal > 0
  const entradaPending = createEntrada.isPending || createEntradaFinanceiro.isPending
  const selectedContaData = contasFinanceiras.find((conta) => conta.id === entrada.contaId)
  const canSubmitEntrada =
    !!entrada.materialId &&
    !!entrada.qty &&
    !!entrada.almoxId &&
    entQtyNumber > 0 &&
    entPrecoNumber >= 0 &&
    (!needsFinanceiro || (!!entrada.contaId && !!entrada.pagamento)) &&
    !entradaPending

  const transferStockItems = useMemo(
    () => estoque.filter((item) => item.almoxarifado?.id === transfer.almoxId),
    [estoque, transfer.almoxId],
  )
  const transferOriginItem = useMemo(
    () => transferStockItems.find((item) => item.material?.id === transfer.materialId),
    [transfer.materialId, transferStockItems],
  )
  const transferAvailableQuantity = transferOriginItem?.quantidade ?? 0
  const transferPending = createTransferencia.isPending

  const updateEntradaField = useCallback((field: EntradaDialogField, value: string) => {
    setEntrada((current) => ({ ...current, [field]: value }))
  }, [])

  const resetEntradaDialog = useCallback(() => {
    autofilledEntradaMaterialIdRef.current = null
    setEntrada(createEntradaDialogState())
  }, [])

  const openEntradaDialog = useCallback(() => {
    autofilledEntradaMaterialIdRef.current = null
    setEntrada((current) => ({ ...current, open: true }))
  }, [])

  const handleEntradaOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setEntrada((current) => ({ ...current, open: true }))
        return
      }

      if (!entradaPending) {
        resetEntradaDialog()
      }
    },
    [entradaPending, resetEntradaDialog],
  )

  const submitEntrada = useCallback(() => {
    const quantity = entQtyNumber
    if (!quantity || quantity <= 0) {
      toast({ title: 'Insira uma quantidade válida', variant: 'warning' })
      return
    }

    const precoUnitario = entPrecoNumber || selectedEntMaterial?.preco_unitario || 0
    const onSuccess = () => {
      toast({ title: 'Entrada registrada com sucesso!', variant: 'success' })
      resetEntradaDialog()
    }
    const onError = (error: Error) => {
      toast({
        title: 'Erro na entrada',
        description: error?.message,
        variant: 'error',
      })
    }

    if (needsFinanceiro) {
      if (!entrada.contaId || !entrada.pagamento) {
        toast({
          title: 'Dados financeiros pendentes',
          description: 'Selecione a conta e a forma de pagamento.',
          variant: 'error',
        })
        return
      }

      createEntradaFinanceiro.mutate(
        {
          p_material_id: entrada.materialId,
          p_almoxarifado_id: entrada.almoxId,
          p_quantidade: quantity,
          p_preco_unitario: precoUnitario,
          p_conta_id: entrada.contaId,
          p_subconta: entrada.subconta,
          p_motivo: `Compra: ${selectedEntMaterial?.nome ?? 'Material'}${
            entrada.obs ? ` — ${entrada.obs}` : ''
          }`,
          p_data: todayISO(),
          p_unidade: entrada.unidade || undefined,
          p_observacao: entrada.obs.trim() || undefined,
          p_fornecedor_id: entrada.fornecedorId || undefined,
          p_forma_pagamento: entrada.pagamento,
        },
        { onSuccess, onError },
      )
      return
    }

    createEntrada.mutate(
      {
        p_material_id: entrada.materialId,
        p_almoxarifado_id: entrada.almoxId,
        p_quantidade: quantity,
        p_preco_unitario: precoUnitario,
        p_unidade: entrada.unidade || undefined,
        p_observacao: entrada.obs.trim() || undefined,
        p_fornecedor_id: entrada.fornecedorId || undefined,
        p_forma_pagamento: entrada.pagamento || undefined,
      },
      { onSuccess, onError },
    )
  }, [
    createEntrada,
    createEntradaFinanceiro,
    entPrecoNumber,
    entQtyNumber,
    entrada,
    needsFinanceiro,
    resetEntradaDialog,
    selectedEntMaterial,
    toast,
  ])

  const updateTransferField = useCallback((field: TransferDialogField, value: string) => {
    setTransfer((current) => {
      if (field === 'almoxId') {
        if (value === current.almoxId) return current
        return {
          ...current,
          almoxId: value,
          materialId: '',
          almoxDestinoId: '',
          qty: '',
        }
      }

      if (field === 'materialId') {
        if (value === current.materialId) return current
        return {
          ...current,
          materialId: value,
          qty: '',
        }
      }

      return { ...current, [field]: value }
    })
  }, [])

  const resetTransferDialog = useCallback(() => {
    setTransfer(createTransferDialogState())
  }, [])

  const openTransferDialog = useCallback((item: EstoqueItem) => {
    setTransfer({
      open: true,
      materialId: item.material?.id ?? '',
      almoxId: item.almoxarifado?.id ?? '',
      almoxDestinoId: '',
      qty: '',
    })
  }, [])

  const handleTransferOpenChange = useCallback(
    (open: boolean) => {
      if (!open && transferPending) {
        return
      }

      if (open) {
        setTransfer((current) => ({ ...current, open: true }))
        return
      }

      resetTransferDialog()
    },
    [resetTransferDialog, transferPending],
  )

  const submitTransfer = useCallback(() => {
    if (!transfer.materialId) {
      toast({ title: 'Selecione um material', variant: 'warning' })
      return
    }

    if (!transfer.almoxId) {
      toast({ title: 'Selecione a origem', variant: 'warning' })
      return
    }

    if (!transfer.almoxDestinoId) {
      toast({ title: 'Selecione o destino', variant: 'warning' })
      return
    }

    if (!transfer.qty) {
      toast({ title: 'Insira uma quantidade válida', variant: 'warning' })
      return
    }

    const quantity = parseDecimalInput(transfer.qty)
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'Informe um valor numérico positivo.',
        variant: 'error',
      })
      return
    }

    if (quantity > transferAvailableQuantity) {
      toast({
        title: 'Quantidade indisponível',
        description: `O local possui apenas ${formatNumber(transferAvailableQuantity)} no estoque.`,
        variant: 'error',
      })
      return
    }

    createTransferencia.mutate(
      {
        p_material_id: transfer.materialId,
        p_almoxarifado_id: transfer.almoxId,
        p_quantidade: quantity,
        p_observacao: 'Transferência manual de estoque',
        p_almoxarifado_destino_id: transfer.almoxDestinoId,
      },
      {
        onSuccess: () => {
          toast({ title: 'Transferência realizada com sucesso!', variant: 'success' })
          resetTransferDialog()
        },
        onError: (error: Error) => {
          toast({
            title: 'Erro na movimentação',
            description: error?.message || 'Verifique se você possui permissões locais.',
            variant: 'error',
          })
        },
      },
    )
  }, [createTransferencia, resetTransferDialog, toast, transfer, transferAvailableQuantity])

  const openDeleteDialog = useCallback((target: DeleteEstoqueTarget) => {
    setDeleteEstoqueTarget(target)
  }, [])

  const confirmDeleteEstoque = useCallback(
    (target: DeleteEstoqueTarget) => {
      createSaida.mutate(
        {
          p_material_id: target.materialId,
          p_almoxarifado_id: target.almoxarifadoId,
          p_quantidade: target.quantidade,
          p_preco_unitario: target.precoUnitario,
          p_observacao: 'Ajuste de estoque / Remoção',
        },
        {
          onSuccess: () => {
            toast({ title: 'Estoque zerado com sucesso!', variant: 'success' })
            setDeleteEstoqueTarget(null)
          },
          onError: (error: Error) => {
            toast({
              title: 'Erro ao zerar estoque',
              description: error?.message,
              variant: 'error',
            })
          },
        },
      )
    },
    [createSaida, toast],
  )

  return {
    entrada,
    entradaPending,
    entradaTotal,
    needsFinanceiro,
    canSubmitEntrada,
    selectedEntMaterial,
    selectedContaData,
    materiais,
    almoxarifados,
    contasFinanceiras,
    fornecedores,
    updateEntradaField,
    openEntradaDialog,
    handleEntradaOpenChange,
    submitEntrada,
    transfer,
    transferPending,
    transferStockItems,
    transferAvailableQuantity,
    updateTransferField,
    openTransferDialog,
    handleTransferOpenChange,
    submitTransfer,
    deleteEstoqueTarget,
    deletePending: createSaida.isPending,
    openDeleteDialog,
    setDeleteEstoqueTarget,
    confirmDeleteEstoque,
  }
}
