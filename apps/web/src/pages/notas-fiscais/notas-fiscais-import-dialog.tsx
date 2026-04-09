import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { StepIndicator } from '../notas-fiscais-import-components'
import { NotasFiscaisImportDialogFooter } from './notas-fiscais-import-dialog-footer'
import type { NotasFiscaisPageModel } from './notas-fiscais-import-dialog-model'
import { NotasFiscaisImportFinalizarStep } from './notas-fiscais-import-finalizar-step'
import { NotasFiscaisImportMatchingStep } from './notas-fiscais-import-matching-step'
import { NotasFiscaisImportPreviewStep } from './notas-fiscais-import-preview-step'
import { NotasFiscaisImportReviewStep } from './notas-fiscais-import-review-step'
import { NotasFiscaisImportSelectStep } from './notas-fiscais-import-select-step'

const TITLES = {
  select: 'Importar NF-e',
  preview: 'Prévia da Nota Fiscal',
  matching: 'Vinculação de Materiais',
  review: 'Revisão da Importação',
  finalizar: 'Confirmar Importação',
} as const

const DESCRIPTIONS = {
  select: 'Arraste ou selecione o arquivo XML da NF-e',
  preview: 'Verifique os dados antes de iniciar a análise',
  matching: 'Confirme os materiais sugeridos pela Gemini AI',
  review: 'Revise e edite os nomes dos produtos novos',
  finalizar: 'Distribua o estoque e escolha a conta para débito',
} as const

function getDialogCopy(model: NotasFiscaisPageModel) {
  if (!model.uploadStep) return null
  if (model.uploadStep === 'matching' && model.showReview) {
    return {
      title: TITLES.review,
      description: DESCRIPTIONS.review,
    }
  }
  return {
    title: TITLES[model.uploadStep],
    description: DESCRIPTIONS[model.uploadStep],
  }
}

function renderStep(model: NotasFiscaisPageModel) {
  if (model.uploadStep === 'select') return <NotasFiscaisImportSelectStep model={model} />
  if (model.uploadStep === 'preview') return <NotasFiscaisImportPreviewStep model={model} />
  if (model.uploadStep === 'matching' && model.showReview) {
    return <NotasFiscaisImportReviewStep model={model} />
  }
  if (model.uploadStep === 'matching') return <NotasFiscaisImportMatchingStep model={model} />
  if (model.uploadStep === 'finalizar') return <NotasFiscaisImportFinalizarStep model={model} />
  return null
}

import React from 'react'

export function NotasFiscaisImportDialog(model: NotasFiscaisPageModel) {
  const formRef = React.useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const cachedModelRef = React.useRef(model)
  if (model.uploadStep !== null) {
    cachedModelRef.current = model
  }
  const activeModel = model.uploadStep !== null ? model : cachedModelRef.current

  const copy = getDialogCopy(activeModel)
  const { toast } = useToast()

  return (
    <Dialog
      open={model.uploadStep !== null}
      onOpenChange={(open) => {
        if (!open) {
          if (model.isRunningAI || model.uploading || model.parsing) {
            toast({ title: 'Aguarde o processamento finalizar antes de fechar.' })
            return
          }
          model.resetUpload()
        }
      }}
    >
      <DialogContent
        className={cn(
          'flex flex-col max-h-full transition-all duration-300',
          model.uploadStep === 'matching' || model.uploadStep === 'finalizar'
            ? 'sm:max-w-2xl'
            : 'sm:max-w-lg',
        )}
      >
        <div ref={formRef} className="flex flex-col flex-1 min-h-0">
          <DialogHeader
            className="shrink-0 pb-5 border-b space-y-0"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <DialogTitle className="sr-only">{copy?.title ?? TITLES.select}</DialogTitle>
          <DialogDescription className="sr-only">
            Importe notas fiscais em etapas: selecione, confira e confirme os dados
          </DialogDescription>

          {activeModel.uploadStep && <StepIndicator currentStep={activeModel.uploadStep} />}

          {activeModel.uploadStep && copy && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeModel.uploadStep}-${activeModel.showReview ? 'review' : 'main'}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="pt-4 text-center"
              >
                <p className="text-[18px] font-bold tracking-tight leading-tight">{copy.title}</p>
                <p className="text-[12px] text-muted-foreground mt-1">{copy.description}</p>
              </motion.div>
            </AnimatePresence>
          )}
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {renderStep(activeModel)}
        </AnimatePresence>

          <NotasFiscaisImportDialogFooter model={activeModel} />
        </div>
        <KeyboardToolbar
          onNext={focusNext}
          onPrev={focusPrev}
          onDone={dismiss}
          hasPrev={canGoPrev}
          hasNext={canGoNext}
        />
      </DialogContent>
    </Dialog>
  )
}
