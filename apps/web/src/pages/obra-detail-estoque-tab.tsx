import { usePermissions } from '@/hooks/use-permissions'
import {
  useAlmoxarifados,
  useFinanceiroContas,
  useFornecedores,
  useMateriais,
  useObraAlmoxarifados,
} from '@/hooks/use-supabase'
import { useObraDetailEstoqueController } from './obra-detail-estoque-controller'
import { ObraDetailEstoqueDeleteDialog } from './obra-detail-estoque-delete-dialog'
import { ObraDetailEstoqueEntradaDialog } from './obra-detail-estoque-entrada-dialog'
import { ObraDetailEstoqueTable } from './obra-detail-estoque-table'
import { ObraDetailEstoqueTransferDialog } from './obra-detail-estoque-transfer-dialog'
import type { ObraDetailEstoqueTabProps } from './obra-detail-estoque-utils'

export function ObraDetailEstoqueTab({
  obraId,
  estoque,
  isLoading = false,
  setBaixaTarget,
}: ObraDetailEstoqueTabProps) {
  const { canManageEstoque } = usePermissions()
  const { data: materiais = [] } = useMateriais()
  const { data: almoxarifados = [] } = useObraAlmoxarifados(obraId)
  const { data: fornecedores = [] } = useFornecedores()
  const { data: allAlmoxarifados = [] } = useAlmoxarifados()
  const { data: contasFinanceiras = [] } = useFinanceiroContas()

  const controller = useObraDetailEstoqueController({
    estoque,
    materiais,
    almoxarifados,
    contasFinanceiras,
    fornecedores,
  })

  return (
    <>
      <ObraDetailEstoqueTable
        estoque={estoque}
        isLoading={isLoading}
        canManageEstoque={canManageEstoque}
        onOpenEntrada={controller.openEntradaDialog}
        onOpenBaixa={setBaixaTarget}
        onOpenTransfer={controller.openTransferDialog}
        onOpenDelete={controller.openDeleteDialog}
      />

      <ObraDetailEstoqueEntradaDialog
        open={controller.entrada.open}
        pending={controller.entradaPending}
        state={controller.entrada}
        materiais={controller.materiais}
        almoxarifados={controller.almoxarifados}
        contasFinanceiras={controller.contasFinanceiras}
        fornecedores={controller.fornecedores}
        selectedMaterial={controller.selectedEntMaterial}
        selectedConta={controller.selectedContaData}
        entradaTotal={controller.entradaTotal}
        needsFinanceiro={controller.needsFinanceiro}
        canSubmit={controller.canSubmitEntrada}
        onOpenChange={controller.handleEntradaOpenChange}
        onFieldChange={controller.updateEntradaField}
        onSubmit={controller.submitEntrada}
      />

      <ObraDetailEstoqueTransferDialog
        open={controller.transfer.open}
        pending={controller.transferPending}
        obraId={obraId}
        almoxarifados={almoxarifados}
        allAlmoxarifados={allAlmoxarifados}
        estoqueItems={controller.transferStockItems}
        availableQuantity={controller.transferAvailableQuantity}
        state={controller.transfer}
        onOpenChange={controller.handleTransferOpenChange}
        onFieldChange={controller.updateTransferField}
        onSubmit={controller.submitTransfer}
      />

      <ObraDetailEstoqueDeleteDialog
        target={controller.deleteEstoqueTarget}
        setTarget={controller.setDeleteEstoqueTarget}
        isPending={controller.deletePending}
        onConfirm={controller.confirmDeleteEstoque}
      />
    </>
  )
}
