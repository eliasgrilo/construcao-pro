import { ObraDetailDarBaixaDialog } from './obra-detail-dar-baixa-dialog'
import { ObraDetailEntradaDialog } from './obra-detail-entrada-dialog'
import { ObraDetailManutencaoDialog } from './obra-detail-manutencao-dialog'
import { ObraDetailMovimentacaoDialog } from './obra-detail-movimentacao-dialog'
import type { BaixaTarget, ContaFinanceira, ObraCustos } from './obra-detail-types'
import { ObraDetailVendaDialog } from './obra-detail-venda-dialog'

interface DarBaixaMutation {
  isPending: boolean
  mutateAsync: (params: {
    material_id: string
    quantidade: number
    custo_unitario?: number
    almoxarifado_id: string
    observacao?: string
  }) => Promise<unknown>
}

export interface ObraDetailDialogsHubProps {
  vendaDialog: boolean
  setVendaDialog: (value: boolean) => void
  vendaInput: string
  setVendaInput: (value: string) => void
  vendaContaId: string
  setVendaContaId: (value: string) => void
  vendaSubconta: 'CAIXA' | 'APLICADO' | 'APLICACAO'
  setVendaSubconta: (value: 'CAIXA' | 'APLICADO' | 'APLICACAO') => void
  vendaFormaPagamento: string
  setVendaFormaPagamento: (value: string) => void
  vendaParcelas: string
  setVendaParcelas: (value: string) => void
  vendaTaxaCartao: string
  setVendaTaxaCartao: (value: string) => void
  vendaSplitEnabled: boolean
  setVendaSplitEnabled: (value: boolean) => void
  vendaSplitContaId: string
  setVendaSplitContaId: (value: string) => void
  vendaSplitValor: string
  setVendaSplitValor: (value: string) => void
  vendaConta1Valor: string
  setVendaConta1Valor: (value: string) => void
  vendaDataPagamento: string
  setVendaDataPagamento: (value: string) => void
  vendaDataPrimeiraParcela: string
  setVendaDataPrimeiraParcela: (value: string) => void
  vendaInputRef: React.RefObject<HTMLInputElement>
  handleConfirmarVenda: () => void
  vendaSubmitting: boolean
  contasFinanceiras: ContaFinanceira[]
  custos: ObraCustos | null
  manutencaoDialogOpen: boolean
  setManutencaoDialogOpen: (value: boolean) => void
  obraId: string
  statusAnterior: string
  onManutencaoSuccess: () => void
  baixaTarget: BaixaTarget | null
  setBaixaTarget: (value: BaixaTarget | null) => void
  darBaixaMutation: DarBaixaMutation
  entradaDialog: boolean
  setEntradaDialog: (value: boolean) => void
  entAlmoxId: string
  movDialog: boolean
  setMovDialog: (value: boolean) => void
  movAlmoxId: string
  movMaterialId: string
  movTipo: string
}

export function ObraDetailDialogsHub({
  vendaDialog,
  setVendaDialog,
  vendaInput,
  setVendaInput,
  vendaContaId,
  setVendaContaId,
  vendaSubconta,
  setVendaSubconta,
  vendaFormaPagamento,
  setVendaFormaPagamento,
  vendaParcelas,
  setVendaParcelas,
  vendaTaxaCartao,
  setVendaTaxaCartao,
  vendaSplitEnabled,
  setVendaSplitEnabled,
  vendaSplitContaId,
  setVendaSplitContaId,
  vendaSplitValor,
  setVendaSplitValor,
  vendaConta1Valor,
  setVendaConta1Valor,
  vendaDataPagamento,
  setVendaDataPagamento,
  vendaDataPrimeiraParcela,
  setVendaDataPrimeiraParcela,
  vendaInputRef,
  handleConfirmarVenda,
  vendaSubmitting,
  contasFinanceiras,
  custos,
  manutencaoDialogOpen,
  setManutencaoDialogOpen,
  obraId,
  statusAnterior,
  onManutencaoSuccess,
  baixaTarget,
  setBaixaTarget,
  darBaixaMutation,
  entradaDialog,
  setEntradaDialog,
  entAlmoxId,
  movDialog,
  setMovDialog,
  movAlmoxId,
  movMaterialId,
  movTipo,
}: ObraDetailDialogsHubProps) {
  return (
    <>
      <ObraDetailVendaDialog
        vendaDialog={vendaDialog}
        setVendaDialog={setVendaDialog}
        vendaInput={vendaInput}
        setVendaInput={setVendaInput}
        vendaContaId={vendaContaId}
        setVendaContaId={setVendaContaId}
        vendaSubconta={vendaSubconta}
        setVendaSubconta={setVendaSubconta}
        vendaFormaPagamento={vendaFormaPagamento}
        setVendaFormaPagamento={setVendaFormaPagamento}
        vendaParcelas={vendaParcelas}
        setVendaParcelas={setVendaParcelas}
        vendaTaxaCartao={vendaTaxaCartao}
        setVendaTaxaCartao={setVendaTaxaCartao}
        vendaSplitEnabled={vendaSplitEnabled}
        setVendaSplitEnabled={setVendaSplitEnabled}
        vendaSplitContaId={vendaSplitContaId}
        setVendaSplitContaId={setVendaSplitContaId}
        vendaSplitValor={vendaSplitValor}
        setVendaSplitValor={setVendaSplitValor}
        vendaConta1Valor={vendaConta1Valor}
        setVendaConta1Valor={setVendaConta1Valor}
        vendaDataPagamento={vendaDataPagamento}
        setVendaDataPagamento={setVendaDataPagamento}
        vendaDataPrimeiraParcela={vendaDataPrimeiraParcela}
        setVendaDataPrimeiraParcela={setVendaDataPrimeiraParcela}
        vendaInputRef={vendaInputRef}
        handleConfirmarVenda={handleConfirmarVenda}
        vendaSubmitting={vendaSubmitting}
        contasFinanceiras={contasFinanceiras}
        custos={custos}
      />

      <ObraDetailManutencaoDialog
        open={manutencaoDialogOpen}
        onClose={() => setManutencaoDialogOpen(false)}
        obraId={obraId}
        statusAnterior={statusAnterior}
        onSuccess={onManutencaoSuccess}
      />

      <ObraDetailDarBaixaDialog
        baixaTarget={baixaTarget}
        setBaixaTarget={setBaixaTarget}
        createSaida={{
          isPending: darBaixaMutation.isPending,
          mutateAsync: (params) =>
            darBaixaMutation.mutateAsync({
              material_id: params.material_id,
              quantidade: params.quantidade,
              custo_unitario: params.custo_unitario ?? 0,
              almoxarifado_id: params.almoxarifado_id,
              observacao: params.observacao ?? undefined,
            }),
        }}
        obraId={obraId}
      />

      <ObraDetailEntradaDialog
        open={entradaDialog}
        onOpenChange={setEntradaDialog}
        obraId={obraId}
        preAlmoxId={entAlmoxId}
      />

      <ObraDetailMovimentacaoDialog
        open={movDialog}
        onOpenChange={setMovDialog}
        obraId={obraId}
        preAlmoxId={movAlmoxId}
        preMaterialId={movMaterialId}
        preTipo={movTipo}
      />
    </>
  )
}
