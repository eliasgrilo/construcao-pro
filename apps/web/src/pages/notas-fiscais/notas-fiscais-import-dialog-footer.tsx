import { Button } from '@/components/ui/button'
import type { FinanceiroConta } from '@/hooks/use-supabase'
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, CreditCard, RefreshCw } from 'lucide-react'
import type { AlmoxarifadoItem } from '../notas-fiscais-types'
import type { NotasFiscaisPageModel } from './notas-fiscais-import-dialog-model'

type Props = {
  model: NotasFiscaisPageModel
}

export function NotasFiscaisImportDialogFooter({ model }: Props) {
  const {
    allDistributionsComplete,
    allResolved,
    almoxarifados,
    confirmedItems,
    contas,
    distributions,
    handleBack,
    handleImport,
    handleParseXML,
    immediateDebitAmount,
    isRunningAI,
    file,
    materiais,
    parsed,
    parsing,
    resetUpload,
    reviewAlmoxarifadoId,
    selectedContaId,
    setSelectedContaId,
    setShowReview,
    startFinalizar,
    startMatching,
    uploadStep,
    uploading,
  } = model

  return (
    <div
      className="shrink-0 flex items-center justify-between pt-4 border-t gap-3"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
    >
      <div>
        {uploadStep === 'select' ? (
          <Button variant="outline" size="sm" onClick={resetUpload}>
            Cancelar
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={isRunningAI || uploading}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {uploadStep === 'select' && (
          <Button
            onClick={handleParseXML}
            disabled={!file || parsing}
            loading={parsing}
            style={file ? { backgroundColor: '#007AFF' } : undefined}
            className={file ? 'text-white hover:opacity-90 transition-opacity' : ''}
          >
            {parsing ? 'Processando…' : 'Processar XML'}
            {!parsing && <ArrowRight className="h-4 w-4 ml-1.5" />}
          </Button>
        )}

        {uploadStep === 'preview' && (
          <Button
            onClick={startMatching}
            disabled={materiais.length === 0 || isRunningAI}
            style={{ backgroundColor: '#007AFF' }}
            className="text-white hover:opacity-90"
          >
            <Bot className="h-4 w-4 mr-1.5" />
            Analisar com IA
          </Button>
        )}

        {uploadStep === 'matching' && isRunningAI && (
          <Button disabled style={{ backgroundColor: '#007AFF' }} className="text-white">
            <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            Analisando…
          </Button>
        )}

        {uploadStep === 'matching' && !isRunningAI && !allResolved && !model.showReview && (
          <Button
            onClick={() => {
              if ((contas?.length ?? 0) === 1)
                setSelectedContaId((contas?.[0] as FinanceiroConta).id)
              setShowReview(true)
            }}
            style={{ backgroundColor: '#FF9500' }}
            className="text-white hover:opacity-90"
          >
            Importar sem vínculos
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}

        {uploadStep === 'matching' &&
          !isRunningAI &&
          allResolved &&
          confirmedItems.length > 0 &&
          almoxarifados.length > 0 && (
            <Button
              onClick={startFinalizar}
              style={{ backgroundColor: '#007AFF' }}
              className="text-white hover:opacity-90"
            >
              <CreditCard className="h-4 w-4 mr-1.5" />
              Finalizar importação
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}

        {uploadStep === 'matching' &&
          !isRunningAI &&
          allResolved &&
          !model.showReview &&
          (confirmedItems.length === 0 || almoxarifados.length === 0) && (
            <Button
              onClick={() => {
                if ((contas?.length ?? 0) === 1)
                  setSelectedContaId((contas?.[0] as FinanceiroConta).id)
                setShowReview(true)
              }}
              style={{ backgroundColor: '#34C759' }}
              className="text-white hover:opacity-90"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Importar NF-e
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}

        {uploadStep === 'matching' && model.showReview && (
          <Button
            onClick={startFinalizar}
            style={{ backgroundColor: '#007AFF' }}
            className="text-white hover:opacity-90"
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}

        {uploadStep === 'finalizar' &&
          (() => {
            const missingConta =
              immediateDebitAmount > 0 &&
              (contas as FinanceiroConta[]).length > 0 &&
              !selectedContaId
            const missingAlmox =
              parsed !== null &&
              parsed.itens.length > 0 &&
              (almoxarifados as AlmoxarifadoItem[]).length > 0 &&
              !reviewAlmoxarifadoId
            const incompleteDistrib =
              !allDistributionsComplete &&
              distributions.length > 0 &&
              (almoxarifados as AlmoxarifadoItem[]).length > 0
            const blockReason = missingConta
              ? 'Selecione uma conta de débito acima'
              : missingAlmox
                ? 'Selecione o estoque de destino acima'
                : incompleteDistrib
                  ? 'Complete a distribuição de estoque acima'
                  : null

            return (
              <div className="flex flex-col items-end gap-1.5">
                {blockReason && (
                  <p className="text-[11px] font-medium" style={{ color: '#FF3B30' }}>
                    ↑ {blockReason}
                  </p>
                )}
                <Button
                  onClick={handleImport}
                  loading={uploading}
                  disabled={!!blockReason}
                  style={{ backgroundColor: '#34C759' }}
                  className="text-white hover:opacity-90 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Confirmar Importação
                </Button>
              </div>
            )
          })()}
      </div>
    </div>
  )
}
